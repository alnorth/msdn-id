# -*- mode: ruby -*-
# vi: set ft=ruby :

def local_cache(box_name, cache_name)
  cache_dir = File.join(File.expand_path("~/.vagrant.d"), "cache", cache_name, box_name)
  if cache_name == "apt"
    partial_dir = File.join(cache_dir, "partial")
    FileUtils.mkdir_p(partial_dir) unless File.exists? partial_dir
  end
  cache_dir
end

def box_url(box_name)
  # Load the box from the local filesystem if possible.
  box_file_name = box_name + ".box"
  db_path = File.expand_path("~/Dropbox/Public/vagrant/" + box_file_name)
  if File.exists?(db_path)
    db_path
  else
    "https://dl.dropboxusercontent.com/u/15047101/vagrant/" + box_file_name
  end
end

Vagrant.configure("2") do |config|
  config.vm.box = "schmoo"
  config.vm.box_url = box_url(config.vm.box)

  config.vm.network :forwarded_port, guest: 5000, host: 5000

  config.vm.synced_folder File.expand_path("~/Documents/dev"), "/home/vagrant/dev/"
  config.vm.synced_folder local_cache(config.vm.box, "apt"), "/var/cache/apt/archives/"

  config.ssh.forward_agent = true
end
