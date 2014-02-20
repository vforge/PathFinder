require 'rake/file_list'

class ApacheAdapter

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
                         'cat ' + file +
                             (@config['grep'] ? '| grep "' + @config['grep'].to_s + '" ' : '') +
                             (@config['tail'] ? '| tail -' + @config['tail'].to_s + ' ' : '') +
                             (@config['head'] ? '| head -' + @config['head'].to_s + ' ' : '') +
                             '| grep \'\w*\s->\s\w*\'' +
                             '| sed -E "s/^(\w*)\s->\s(\w*)$/\1;\2/"'
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