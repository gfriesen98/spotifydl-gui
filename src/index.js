require('dotenv').config()
const path = require('path');
const rootStyleSheet = require('./styles/rootStyleSheet');
const { youtube } = require('scrape-youtube');
const { singleTrackUrl } = require('./utility/spotify');
const { getData, getTracks } = require('spotify-url-info');
const query = require('./utility/query');
const checkDependencies = require('./utility/checkDependencies');
const {
    FlexLayout, QLabel,
    QLineEdit, QPlainTextEdit,
    QMainWindow, QPushButton,
    QWidget, QScrollBar,
    QComboBox, QCheckBox,
    QFileDialog, FileMode,
} = require('@nodegui/nodegui');

const YtDlp = require('./utility/ytdlp').YtDlp;
const SPOTIFY_PREFIXES = ['https://open.spotify.com/track', 'https://play.spotify.com/track', 'https://open.spotify.com/playlist', 'https://open.spotify.com/album'];

const Window = new QMainWindow();
const RootView = new QWidget();
const RootViewLayout = new FlexLayout();
const Fieldset = new QWidget();
const FieldsetLayout = new FlexLayout();
const Fieldset2 = new QWidget();
const FieldsetLayout2 = new FlexLayout();
const UrlLayout = new QWidget();
const UrlRowLayout = new FlexLayout();
const UrlLabel = new QLabel();
const UrlInput = new QLineEdit();
const DownloadDirLayout = new QWidget();
const DownloadDirRowLayout = new FlexLayout();
const DownloadDirLabel = new QLabel();
const DownloadDirInput = new QLineEdit();
const OptionsLayout = new QWidget();
const OptionsRowLayout = new FlexLayout();
const OptionsLabel = new QLabel();
const FiletypeCombobox = new QComboBox();
const CheckboxLayout = new QWidget();
const CheckboxRowLayout = new FlexLayout();
const IsYTCheck = new QCheckBox();
const OutputTextBox = new QPlainTextEdit();
const TextboxScrollBar = new QScrollBar();      // Define a new scrollbar to set autoscrolling
const ButtonRow = new QWidget();
const ButtonRowLayout = new FlexLayout();
const DownloadButton = new QPushButton();
const DirectoryButton = new QPushButton();
const FileDialogBox = new QFileDialog();

/**
 * Setup main application window
 */
async function main() {
    Window.setWindowTitle('spotifydl-gui');
    Window.setFixedSize(800, 600);

    // Root view
    RootView.setObjectName('rootView');
    RootView.setLayout(RootViewLayout);

    // Fieldset
    Fieldset.setObjectName('fieldset');
    Fieldset.setLayout(FieldsetLayout);

    // Fieldset 2
    Fieldset2.setObjectName('fieldset2');
    Fieldset2.setLayout(FieldsetLayout2);

    // URL row
    UrlLayout.setObjectName('numCharsRow');
    UrlLayout.setLayout(UrlRowLayout);

    UrlLabel.setText('url: ');
    UrlRowLayout.addWidget(UrlLabel);

    UrlInput.setObjectName('numCharsInput');
    UrlRowLayout.addWidget(UrlInput);

    // Download dir row
    DownloadDirLayout.setObjectName('downloadDirLayout');
    DownloadDirLayout.setLayout(DownloadDirRowLayout);

    DownloadDirLabel.setText('download location: ');
    DownloadDirRowLayout.addWidget(DownloadDirLabel);

    DownloadDirInput.setObjectName('downloadDirInput');
    DownloadDirInput.setReadOnly(true);
    DownloadDirRowLayout.addWidget(DownloadDirInput);

    // Options row
    OptionsLabel.setObjectName('optionsLabel')
    OptionsLayout.setObjectName('optionsLayout');
    OptionsLayout.setLayout(OptionsRowLayout);
    OptionsLabel.setText('options: ');
    OptionsRowLayout.addWidget(OptionsLabel);

    FiletypeCombobox.setObjectName('filetypeCombobox')
    FiletypeCombobox.addItem(undefined, '-- filetype (default mp3) --');
    FiletypeCombobox.addItem(undefined, 'mp3');
    FiletypeCombobox.addItem(undefined, '"flac"');
    OptionsRowLayout.addWidget(FiletypeCombobox);

    IsYTCheck.setObjectName('isytcheck');
    IsYTCheck.setText('Youtube URL?');
    CheckboxLayout.setLayout(CheckboxRowLayout);
    CheckboxRowLayout.addWidget(IsYTCheck);


    // Output box
    OutputTextBox.setObjectName('output');
    OutputTextBox.setReadOnly(true);
    OutputTextBox.setWordWrapMode(0);

    TextboxScrollBar.setMaximum(TextboxScrollBar.value()); // not sure if needed tbh
    OutputTextBox.setVerticalScrollBar(TextboxScrollBar);  // apply new scrollbar to output box
    OutputTextBox.setVerticalScrollBarPolicy(0);    // policy 2: Always show scrollbar, 1: Show scrollbar when needed, 0: Hide scrollbar


    // Button row
    ButtonRow.setLayout(ButtonRowLayout);
    ButtonRow.setObjectName('buttonRow');

    // Buttons
    DownloadButton.setText('Download');
    DownloadButton.setEnabled(false);
    DownloadButton.setObjectName('downloadButton');

    DirectoryButton.setText('select download location');
    DirectoryButton.setObjectName('directoryButton');

    // File dialog
    FileDialogBox.setFileMode(FileMode.Directory);

    // Add the widgets to the respective layouts
    // fieldset
    FieldsetLayout.addWidget(UrlLayout);
    FieldsetLayout.addWidget(DirectoryButton);
    FieldsetLayout.addWidget(DownloadDirLayout);

    // fieldset2
    FieldsetLayout2.addWidget(OptionsLayout);
    // fieldsetLayout2.addWidget(checkboxLayout);

    // buttonrow view
    ButtonRowLayout.addWidget(DownloadButton);

    // rootview
    RootViewLayout.addWidget(Fieldset);
    RootViewLayout.addWidget(Fieldset2);
    RootViewLayout.addWidget(OutputTextBox);
    RootViewLayout.addWidget(ButtonRow);

    /* Event handling */
    OutputTextBox.addEventListener('textChanged', outputOnTextChange);
    FiletypeCombobox.addEventListener('currentIndexChanged', getFiletype);
    DirectoryButton.addEventListener('clicked', directoryButtonOnClick);
    DownloadButton.addEventListener('clicked', downloadOnClick);

    // Apply styling
    RootView.setStyleSheet(rootStyleSheet);

    Window.setCentralWidget(RootView);
    Window.show();

    // check for dependencies
    checkDependencies(OutputTextBox, DownloadButton);
    global.win = Window;
}

/**
 * Returns the selected filetype index string
 * @returns {string} flac|mp3
 */
function getFiletype() {
    switch (FiletypeCombobox.currentIndex()) {
        case 2: return 'flac';
        case 1:
        default: return 'mp3'
    }
}

/**
 * Move textbox scrollbar down on text change
 */
function outputOnTextChange() {
    TextboxScrollBar.setSliderPosition(TextboxScrollBar.maximum()); // set scroll position to the maximum (down)
}

/**
 * Execute filepicker dialog
 */
function directoryButtonOnClick() {
    FileDialogBox.exec();
    const selectedDir = FileDialogBox.selectedFiles()[0];
    console.log(selectedDir);
    DownloadDirInput.setText(selectedDir);
}

async function downloadOnClick() {
    let input = UrlInput.text();
    let download_dir = DownloadDirInput.text() === '' ? './downloads' : DownloadDirInput.text();

    OutputTextBox.setPlainText('');
    try {
        if (typeof (input) === 'undefined' || input === null) throw new Error('Please provide an input!');

        OutputTextBox.insertPlainText("[Spotify] Gathering info from Spotify...\n");

        // playlists handled seperately for now
        if (input.startsWith('https://open.spotify.com/playlist')) {
            OutputTextBox.insertPlainText("[Spotify] Playlists are limited to 100 tracks\n");
            const data = await getTracks(input);
            let temp = "";
            for await (const n of data) {
                const artist = n.artists[0].name;
                const album_name = n.album.name;
                const track = n.name;
                const dir = `${download_dir}/${artist}/${album_name}`;
                const yt_query = track === album_name ? `${artist} topic ${album_name} ${track}` : `${artist} topic ${track}`;
                const results = await youtube.search(yt_query);
                let first_result = results.videos[0];
                OutputTextBox.insertPlainText(`[Youtube] Found video for ${track}:\n`);
                    OutputTextBox.insertPlainText(`[Youtube] URL: ${first_result.link}\n[Youtube] Video: ${first_result.title} uploaded by ${first_result.channel.name}\n`);
                await YtDlp.downloadTrack(first_result.link, dir, `${n.track_number} - ${track}.${getFiletype()}`, OutputTextBox, { file_type: getFiletype(), album_name });
                temp = dir;
            }
            OutputTextBox.insertPlainText(`\nFinished! Downloads can be found in ${path.resolve(temp)}\n`);
        } else {
            const spotifyData = await getData(input);
            if (spotifyData.type === 'album') {
                for await (const [i, n] of spotifyData.tracks.items.entries()) {
                    const queryData = query(spotifyData, i);
                    const download_path = `${download_dir}/${queryData.artist}/${queryData.album}`;
                    const filename_template = `${queryData.track_number} - ${queryData.track}.%(ext)s`;
                    const results = await youtube.search(queryData.query);
                    let first_result = results.videos[0];
                    OutputTextBox.insertPlainText(`[Youtube] Found video for ${queryData.track}:\n`);
                    OutputTextBox.insertPlainText(`[Youtube] URL: ${first_result.link}\n[Youtube] Video: ${first_result.title} uploaded by ${first_result.channel.name}\n`);
                    await YtDlp.downloadTrack(first_result.link, download_path, filename_template, OutputTextBox, { file_type: getFiletype(), album_name: queryData.album });
                }

            } else {
                const queryData = query(spotifyData);
                const download_path = `${download_dir}/${queryData.artist}/${queryData.album}`;
                const filename_template = `${queryData.track_number} - ${queryData.track}.%(ext)s`;
                const results = await youtube.search(queryData.query);
                let first_result = results.videos[0];
                OutputTextBox.insertPlainText(`[Youtube] Found video for ${queryData.track}:\n`);
                OutputTextBox.insertPlainText(`[Youtube] URL: ${first_result.link}\n[Youtube] Video: ${first_result.title} uploaded by ${first_result.channel.name}\n`);
                await YtDlp.downloadTrack(first_result.link, download_path, filename_template, OutputTextBox, { file_type: getFiletype(), album_name: queryData.album });
            }
        }


        // if (input.startsWith(SPOTIFY_PREFIXES[0]) || input.startsWith(SPOTIFY_PREFIXES[1])) {
        //     const youtube_result = await singleTrackUrl(input, OutputTextBox);
        //     const url = youtube_result.first_result.link;
        //     const download_path = `${download_dir}/${youtube_result.artist}/${youtube_result.album_name}`;
        //     const filename_template = `${youtube_result.track_number} - ${youtube_result.track}.%(ext)s`;
        //     await YtDlp.downloadTrack(url, download_path, filename_template, OutputTextBox, { file_type: getFiletype(), album_name: youtube_result.album_name });

        // } else if (input.startsWith(SPOTIFY_PREFIXES[3])) {
        //     const data = await getData(input);
        //     const album_name = data.name;
        //     const artist = data.artists[0].name;
        //     const download_path = `${download_dir}/${artist}/${album_name}`;
        //     for await (const n of data.tracks.items) {
        //         const track = n.name;
        //         // Tracks can sometimes be the same as the album name which nets us different results
        //         const yt_query = track === album_name ? `${artist} topic ${album_name} ${track}` : `${artist} topic ${track}`;
        //         const results = await youtube.search(yt_query);
        //         let first_result = results.videos[0];
        //         OutputTextBox.insertPlainText(`[Youtube] Found video for ${track}:\n`);
        //         OutputTextBox.insertPlainText(`[Youtube] URL: ${first_result.link}\n`);
        //         await YtDlp.downloadTrack(first_result.link, download_path, `${n.track_number} - ${track}.${getFiletype()}`, OutputTextBox, { file_type: getFiletype(), album_name });
        //     }
        //     OutputTextBox.insertPlainText(`\nFinished! Downloads can be found in ${path.resolve(download_path)}\n`);

        // } else if (input.startsWith(SPOTIFY_PREFIXES[2])) {


        // } // youtube stuff here
        // else {
        //     throw new Error('Invalid URL provided');
        // }
    } catch (err) {
        console.error(err);
        console.log(err.message);
        OutputTextBox.insertPlainText("\n" + err.message + "\n");
    }
}

main().catch(console.error);