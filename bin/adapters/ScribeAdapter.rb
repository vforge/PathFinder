require 'rake/file_list'

class ScribeAdapter

  def initialize config
    @config = config

    @threads = config['threads'] || 8
  end

  def load &extract

    threads = []

    file_list = Rake::FileList.new(@config['file'].to_s)
    left = file_list.count

    file_list.each { |file|

      while(threads.count >= @threads) do sleep 0.5  end

      threads << Thread.new {
        puts 'Working on: ' << file << "\n"

        extract.call IO.popen(
           'gzcat ' + file +
               (@config['grep'] ? '| grep "' + @config['grep'].to_s + '" ' : '') +
               (@config['tail'] ? '| tail -' + @config['tail'].to_s + ' ' : '') +
               (@config['head'] ? '| head -' + @config['head'].to_s + ' ' : '') +
               '| grep \'&a=\d.*&r=[^&]\'' +
               '| perl -ne \'use URI::Escape; if($_ =~ /x=([^&]+).*&a=(\d+).*n=(?:0|14)&r=.*?\/(?=\p{Lu})(\p{Lu}[^&]+)/){ print "$1;", uri_unescape(uri_unescape($3)), ";$2\n"}; \''+
               '| grep ";[1-9][0-9]*$"' +
               '| grep -v "^;{0,2}$"'
       )

        left = left.pred
        puts 'Left: ' << left.to_s << "\n"

        threads.delete Thread.current
      }
    }

    #Wait for all threads to finish
    threads.each(&:join)
  end
end