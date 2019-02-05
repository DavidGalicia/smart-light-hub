# Readme

## How to Setup Your Development Environment on Windows

### Install Python 2

Install Python 2.7.15 64bit (or better):

https://www.python.org/downloads/windows/

After the installation, make your system PATH contains lines like these:

```
C:\Python27
C:\Python27\include
C:\Python27\Scripts
```

### Install windows-build-tools
Install windows-build-tools using npm:

```
npm install --global --production windows-build-tools@4.0.0
```

### Install Lame
Go to the the Lame Download Page:

https://lame.buanzo.org/#lamewindl

Download and run the exe file.

After the installation, make sure your system PATH contains a line like this:

```
C:\Program Files (x86)\Lame For Audacity
```

### Install avconf
Install a pre-built binary of avconf 11.3 64-bit (or better):

http://builds.libav.org/windows/release-gpl/

Extract the .7z file to the C: drive and folder containing avconf.exe to your system PATH.

### Install gmusicapi
Install gmusicapi using pip:

```
pip install gmusicapi
```

## How to run

Assuming you extrated the project to C:\smart-light-hub, open a command prompt and navigate to that path.

Run this command:

```
node app.js
```

The server will run and print the url to the website.

Note: Internet Explorer 11 is not supported.