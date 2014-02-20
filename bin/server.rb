require 'socket'
require 'yaml'
require 'uri'
require 'mime/types'

port = $config['port']
@cors = $config['CORS'] || false

server = TCPServer.open(port)  # Socket to listen on given port
$stdout.puts 'Listening on port: ' << port.to_s

@statuses = {
    ok: 'HTTP/1.1 200 OK',
    not_found: "HTTP/1.1 404 Not Found",
    server_error: "HTTP/1.1 500 Internal Server Error"
}

def get_headers status, size, type
  headers = [
      @statuses[status],
      'Server: PathFinder',
      "Content-Type: #{type}; charset=UTF-8",
      "Content-Length: #{size}",
      'Connection: close',
  ]

  if @cors
    headers.push 'Access-Control-Allow-Origin: *'
  end

  headers.push "\r\n"

  headers.join("\r\n")
end

loop do
  Thread.start(server.accept) do |client|
    get = client.gets.strip.split[1][1..-1]
    p get

    if get.include? 'api'
      route, command, site, page = get.split('/')
    end

    begin
      if !command.nil? &&  ($path_finder.respond_to? command.downcase.to_sym)
        ret = $path_finder.send(command.downcase, site, page).to_json
        status = :ok
        mime = 'application/json'
      elsif get != ''
        path = 'bin/view/'.concat get

        ret = File.open(path).read

        status = :ok
        mime = MIME::Types.type_for(path)[0]
      elsif get == ''
        ret = File.open('bin/view/index.html').read
        status = :ok
        mime = 'text/html'
      else
        ret = ['Method Not Implemented'].to_json
        status = :not_found
        mime = 'application/json'
      end

      client.print get_headers status, ret.bytesize, mime
      client.print ret
    rescue => e
      ret = ['Server Error'].to_json
      client.print get_headers :server_error, ret.bytesize, :json
      puts e.message
    ensure
      client.close
    end
  end
end
