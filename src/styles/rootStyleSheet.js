const rootStyleSheet = `
#rootView {
    padding: 5px;
}
#fieldset {
    padding: 10px;
    border: 2px ridge #bdbdbd;
    margin-bottom: 4px;
}
#numCharsRow, #buttonRow, #downloadDirLayout {
    flex-direction: row;
}
#numCharsRow {
    margin-bottom: 5px;
}
#numCharsInput {
    width: "90%";
    margin-left: 2px;
}
#downloadDirInput {
    width: "84.4%";
    margin-left: 2px;
}
#output {
    height: "75%";
    margin-bottom: 4px;
}
#buttonRow{
    margin-bottom: 5px;
}
#downloadButton {
    width: "100%";
    height: 70px;
    margin-right: 3px;
}
`;

module.exports = rootStyleSheet;