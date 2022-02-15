const rootStyleSheet = `
#rootView {
    padding: 5px;
}
#fieldset {
    padding: 10px;
    border: 2px ridge #bdbdbd;
    margin-bottom: 6px;
}
#fieldset2 {
    padding: 10px;
    border: 2px ridge #bdbdbd;
    margin-bottom: 8px;
}
#numCharsRow, #buttonRow, #downloadDirLayout, #optionsLayout {
    flex-direction: row;
}
#numCharsRow {
    margin-bottom: 5px;
}
#numCharsInput {
    width: "97%";
    margin-left: 2px;
}
#downloadDirInput {
    width: "100%";
    margin-left: 2px;
    border: none;
    background-color: #f0f0f0;
}
#filetypeCombobox {
    width: "25%";
}
#output {
    height: "60%";
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