require 'mysql2'
require 'uri'
require "net/http"
require "uri"
require "JSON"

class PathFinder

  private

  def initialize config
    @config = config

    database = @config['database']

    Mysql2::Client.default_query_options.merge!(:as => :array)

    @con = Mysql2::Client.new(
        :host => database['host'],
        :username => database['user'],
        :password => database['password'],
        :database => database['DB'],
        :connect_flags => Mysql2::Client::MULTI_STATEMENTS,
        :reconnect => true,
    )

  end

  def is_numeric? string
    true if Float(string) rescue false
  end

  def sanitize string
    if is_numeric? string
      "`" << string << "`"
    else
      string
    end
  end

  def normalize link
    unless link[0].nil? || link[1].nil? || link[2].nil?
      [
          sanitize(link[0]),
          @con.escape(link[1].slice(0, 255)),
          @con.escape(link[2].slice(0, 255))
      ]
    else
      []
    end
  end

  public

  def fetch
    unless @config['adapter'].nil?
      adapter = @config['adapter']['name'] + 'Adapter'

      begin
        require_relative "adapters/#{adapter}"
      rescue LoadError => details
        p "Adapter class not found - #{details.message}"
        return 0
      end

      Object.const_get( adapter ).new( @config['adapter']['config'] ).load {|content|
        article_pairs = {}
        lines = content.readlines

        puts 'Received ' << lines.length.to_s << " lines\n"

        lines.each_with_index { |link, i|
          #p i if i % 10000 == 0
          result = normalize(link.strip.encode('utf-8', 'binary', :invalid => :replace, :undef => :replace).split(';'))

          article_pairs[result[0]] = [] if article_pairs[result[0]].nil?
          article_pairs[result[0]] << [result[1], result[2]]
        }

        transform article_pairs
      }
      puts 'finished extracting'
    end
  end

  def transform article_pairs

    article_pairs.each { |pair|
      unless pair[0].nil?
        sql = "CREATE TABLE IF NOT EXISTS #{pair[0]}(article_from VARCHAR(255) NOT NULL, article_to VARCHAR(255), id_to VARCHAR(255) NOT NULL, count INT NOT NULL, last_update DATE NOT NULL, UNIQUE INDEX pair (article_from, id_to));"
        sql << "INSERT INTO #{pair[0]} (article_from, id_to, count, last_update) VALUES"

        length = pair[1].count - 1

        pair[1].each_with_index { |data, i|
          sql << "('#{data[0]}', '#{data[1]}', 1, NOW())"
          sql << ',' unless i.eql? length
        }

        sql <<  ' ON DUPLICATE KEY UPDATE `count` = `count` + 1, `last_update` = NOW();'

        load sql
      end
    }
  end

  def load sql
    begin
      @con.abandon_results!
      @con.query sql
    rescue Mysql2::Error => e
      puts e.error
      #puts sql
    end
  end

  def fix site
    flag = true

    db_name = sanitize site

    while flag
      ids = @con.query("SELECT DISTINCT id_to FROM #{db_name} WHERE article_to IS NULL LIMIT 200").to_a.flatten

      unless ids.empty?
        ids = ids.select{|id| is_numeric? id}

        uri = URI.parse "http://#{db_name}.wikia.com/wikia.php?controller=ArticlesApi&method=getDetails&ids=#{ids.join(',')}&abstract=0&width=0&height=0"
        response = Net::HTTP.get_response uri

        if response.code == '301'
          response = Net::HTTP.get_response URI.parse response.header['location']
        end

        updated = []

        items = JSON.parse response.body

        if !items['items'].nil? && (items['items'].respond_to? :each)
          items['items'].each do |article|
            id = article[0].to_i
            updated << id

            title = article[1]['title'].gsub(' ', '_')
            title = 'Category:' << title if article[1]['ns'] == 14
            title = @con.escape(title)
            begin
              @con.query("UPDATE #{db_name} SET article_to = '#{title}' WHERE id_to = '#{id}'")
            rescue Mysql2::Error => e
              p e.error
              p "UPDATE #{db_name} SET article_to = '#{title}' WHERE id_to = '#{id}'"
            end
          end

          ids.map!{|id| id.to_i}
          to_delete = ids - updated

          unless to_delete.empty?
            to_delete = to_delete.flatten.select{ |id| is_numeric? id }
            to_delete = @con.escape(to_delete.join(','))

            @con.query("DELETE FROM #{db_name} WHERE id_to IN (#{to_delete})")
          end
        end

      else
        p 'Fixed'
        flag = false
      end
    end
  end

  def get_sites *args
    @con.query('SHOW tables').to_a.flatten
  end

  def get_params args
    [sanitize(args[0] || @config['site']), @con.escape(args[1] || @config['page']), args[2]]
  end

  def get_pages *args
    site, page = get_params args

    unless page.nil?
      query = "WHERE article_from LIKE '%#{page}%'"
    else
      query = ''
    end

    @con.query("SELECT DISTINCT article_from FROM #{site} #{query} ORDER BY count DESC LIMIT 10").to_a.flatten
  end

  def get_path *args
    finish = false
    site, page, startPage = get_params args

    path = []

    unless startPage.nil?
      path << [startPage[0].strip, 0]
      path << [page.strip, startPage[1]]
    else
      path << [page.strip, 0]
    end

    while !finish
      begin
        pages = @con.query("SELECT article_to, count FROM #{site} WHERE article_from = '#{page}' ORDER BY count DESC LIMIT 5").to_a
      rescue Mysql2::Error => e
        p e.error
      end

      if pages.empty?
        finish = true
      else
        page = pages.find {|elem|
          if !elem[0].nil? && path.flatten.index(elem[0].strip).nil?
            path << [elem[0].strip, elem[1]]
          end
        }

        unless page.nil?
          page = @con.escape page[0]
        else
          finish = true
        end
      end
    end

    path
  end

  def get_path_for

  end

  def get_most_visited *args
    site, page = get_params args

    @con.query("SELECT article_to, count FROM #{site} WHERE article_from = '#{page}' ORDER BY count DESC").to_a
  end

  def get_all_paths *args
    graph = []

    site, page = get_params args

    get_most_visited(site, page).each { |title|
      graph << get_path( site, title[0], [page, title[1]] )
    }

    graph
  end
end

#mysql> select el.article_from, el.article_to, er.article_to, err.article_to, errr.article_to from elderscrolls as el JOIN elderscrolls as er JOIN elderscrolls as err JOIN elderscrolls as errr where el.article_to = er.article_from AND  el.article_from = 'Weapons_(Skyrim)' AND er.article_to = err.article_from AND err.article_to = errr.article_from ORDER BY el.count, er.count DESC;