# How to Setup Your Development Environment on Windows

## Install windows-build-tools
Install windows-build-tools using npm:

```
npm install --global --production windows-build-tools
```

This will also install Python 2 for you.

After the installation, make your system PATH contains lines like these:

```
C:\Python27
C:\Python27\include
C:\Python27\Scripts
```

## Install Lame
Install Lame so the node-lame module can work:
https://www.npmjs.com/package/node-lame

After the installation, make sure your system PATH contains a line like this:

```
C:\Program Files (x86)\Lame For Audacity
```

## Install avconf
Install a pre-built binary of avconf 11.3 64-bit (or better):

http://builds.libav.org/windows/release-gpl/

Extract the .7z file to the C: drive and folder containing avconf.exe to your system PATH.

## Install gmusicapi
Install gmusicapi using pip:

```
pip install gmusicapi
```
