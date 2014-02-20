#!/usr/bin/env ruby
# encoding: UTF-8

require_relative 'bin/PathFinder'
require 'yaml'
require 'optparse'

$config = {}
mode = 'etl'
site = 'wowwiki'

OptionParser.new do |opts|
  opts.banner = "Usage: pathfinder.rb [options]"

  opts.on( '-c', '--config CONFIG', 'Path to config' ) do |path|
    begin
      $config = YAML::load_file path
    rescue LoadError => details
      p "Something went wrong -> #{details.message}"
    end
  end

  opts.on( '-m', '--mode MODE', 'Mode to run [etl,server,fix]. Default: etl' ) do |m|
    mode = m
  end

  opts.on( '-s', '--site SITE', 'If fix mode chosen specify which site to fix. Default: wowwiki' ) do |s|
    site = s
  end

end.parse!

unless ($config.empty?)
  $path_finder = PathFinder.new($config)

  case mode
    when 'etl'
      start =  Time.new

      print $path_finder.fetch

      puts '====='
      puts 'Work time: ' << (Time.new - start).to_s
    when 'server'
      require_relative 'bin/server'
    when 'fix'
      start =  Time.new

      print $path_finder.fix site

      puts '====='
      puts 'Work time: ' << (Time.new - start).to_s
  end
else
  puts 'Config not found'
end



