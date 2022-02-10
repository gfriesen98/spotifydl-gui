# spotifydl-gui

gui for yt-dlp that parses metadata from spotify urls

written in nodejs with nodegui

i dont have releases yet so you have to clone and build yourself

its early in development, the code needs to be restructured

the program should download yt-dlp and ffmpeg on launch but its probably still somewhat broken

# usage

windows development requirements:

1. Visual Studio 2017+
2. CMake 3.1+
3. NodeJs 12.x and up

linux/wsl development requirements:

1. Make, GCC v7
2. CMake 3.1
3. NodeJs 12.x and up

```
git clone https://github.com/gfriesen98/spotifydl-gui

cd spotifydl-gui

npm install 

npm start
```

if the program starts then you can continue to the build section

if it errors on npm install, read the nodegui setup guide: [https://docs.nodegui.org/docs/guides/getting-started/](https://docs.nodegui.org/docs/guides/getting-started/)

if youre running on wsl you'll have to set up an xserver like VcsXsrv

# building

```
# install packer as a dev dependency
npm install --save-dev @nodegui/packer

# init the app (run once)
npx nodegui-packer --init spotifydl-gui

# run the pack command
npx nodegui-packer --pack ./dist

or run npm run build
```

binaries are built for the platform packer is run on (win32, linux, macos)

windows exe is located in `./deploy/win32/build/spotifydl-gui`. run `quode.exe`

linux appimage is located in `./deploy/linux/build/spotifydl-gui`. run `./Application-x86_64.AppImage`

i dont have a mac to build on

for more information read here [https://github.com/nodegui/packer](https://github.com/nodegui/packer)

# dependencies

spotifydl-gui depends on yt-dlp and ffmpeg, but the program downloads them for you on startup

if there are issues, create a folder in the project root called `binaries` and:

1. download `yt-dlp.exe` from here [https://github.com/yt-dlp/yt-dlp/releases](https://github.com/yt-dlp/yt-dlp/releases) and place `yt-dlp_min.exe` into `binaries`

2. download ffmpeg from here (ffmpeg mirror) [https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip)

3. unzip to `binaries`

4. copy ffmpeg.exe and ffprobe.exe from the bin folder into binaries. you can delete the remaining ffmpeg files
