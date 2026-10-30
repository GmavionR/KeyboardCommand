> es -version
1.1.0.38
40294@antlrv E:\DevProjects\LocalProjects\tauriProjects\KeyboardCommand git:main ?3 ~5
> es -help
ES 1.1.0.38
ES is the command-line interface for searching Everything from a command prompt.

Usage
es.exe [options] search text

options
   Optional flags to change search behavior, sorting, or output formatting.

search text
   Search query using the Everything search syntax.

For example:
es.exe -highlight Everything ext:exe;ini


Search options
   -r <search>, -regex <search>
        Search using regular expressions.
   -i, -case
        Match case.
   -w, -ww, -whole-word, -whole-words
        Match whole words.
   -p, -match-path
        Match full path.
   -a, -diacritics
        Match diacritical marks.
   -prefix
        Match start of words.
   -suffix
        Match end of words.
   -ignore-punctuation
        Ignore punctuation in filenames.
   -ignore-whitespace
        Ignore whitespace in filenames.

   -n <num>, -count <num>
        Specify the maximum number of results to find.

   -path <path>
        Search for subfolders and files in path.
   -parent-path <path>
        Search for subfolders and files in the parent of path.
   -parent <path>
        Search for files with the specified parent path.

   /ad
        Folders only.
   /a-d
        Files only.
   /a[RHSDAVNTPLCOIEUPM]
        DIR style attributes search.
        R = Read only.
        H = Hidden.
        S = System.
        D = Directory.
        A = Archive.
        V = Device.
        X = No scrub data.
        N = Normal.
        T = Temporary.
        L = Reparse point.
        C = Compressed.
        O = Offline.
        I = Not content indexed.
        E = Encrypted.
        U = Unpinned.
        P = Pinned.
        M = Recall on data access.
        - = Prefix a flag with - to exclude.


Sort options
   -s
        Sort by full path.
   -sort <name[-ascending|-descending]>
        Set sort
        name=name|path|size|extension|date-created|date-modified|date-accessed|
        attributes|filelist-filename|run-count|date-recently-changed|date-run|
        <property-name>

   /on, /o-n, /os, /o-s, /oe, /o-e, /od, /o-d
        DIR style sorts.
        N = Name.
        S = Size.
        E = Extension.
        D = Date modified.
        - = Sort in descending order.


Display options
   -name
   -path-column
   -full-path-and-name, -filename-column
   -extension, -ext
   -size
   -date-created, -dc
   -date-modified, -dm
   -date-accessed, -da
   -attributes, -attribs, -attrib
   -filelist-filename
   -run-count
   -date-run
   -date-recently-changed, -rc
   -<property-name>
   -add-columns <property-name;property-name2;...>
        Show the specified column.

   -highlight
        Highlight matching text in results.
   -highlight-color <color>
        Highlight color 0x00-0xff.

   -viewport-offset <offset>
        Show results starting from offset.
   -viewport-count <num>
        Limit the number of results shown to <num>.

   -csv
   -efu
   -json
   -m3u
   -m3u8
   -tsv
   -txt
        Change the output format.

   -size-format <format>
        0=auto, 1=Bytes, 2=KB, 3=MB.
   -date-format <format>
        0=auto, 1=ISO-8601, 2=FILETIME, 3=ISO-8601(UTC), 4=User Locale,
        5=ISO-8601 (full resolution), 6=ISO-8601(UTC) (full resolution)

   -filename-color <color>
   -name-color <color>
   -path-color <color>
   -extension-color <color>
   -size-color <color>
   -date-created-color <color>, -dc-color <color>
   -date-modified-color <color>, -dm-color <color>
   -date-accessed-color <color>, -da-color <color>
   -attributes-color <color>
   -file-list-filename-color <color>
   -run-count-color <color>
   -date-run-color <color>
   -date-recently-changed-color <color>, -rc-color <color>
   -add-column-colors <property-name=color;property-name2=color;...>
        Set the column color 0x00-0xff.

   -filename-width <width>
   -name-width <width>
   -path-width <width>
   -extension-width <width>
   -size-width <width>
   -date-created-width <width>, -dc-width <width>
   -date-modified-width <width>, -dm-width <width>
   -date-accessed-width <width>, -da-width <width>
   -attributes-width <width>
   -file-list-filename-width <width>
   -run-count-width <width>
   -date-run-width <width>
   -date-recently-changed-width <width>, -rc-width <width>
   -add-column-widths <property-name=width;property-name2=width;...>
        Set the column width 0-65535.

   -no-digit-grouping
        Disable digit grouping (commas) for numbers.
   -double-quote
        Wrap paths and filenames with double quotes.


Journal options
   -j [filename-filter], -journal [filename-filter]
        Show index journal changes.
        Any journal option below also shows journal changes.
        Wildcards are supported in the filename-filter.
        Match the whole case-insensitive filename.
        Both the filename before and after the change are searched.
        Use a path separator to match full path.
   -get-journal-id
        Return the current journal ID.
   -get-journal-pos
        Return the current journal ID and next change ID.
   -action-filter <semicolon (;) delimited list of actions>
        Show only changes with the specified actions:
        folder-create;folder-delete;folder-rename;folder-move;folder-modify;
        file-create;file-delete;file-rename;file-move;file-modify
   -added-filename-only
        Match filenames created, renamed, or moved after the change.
   -removed-filename-only
        Match filenames deleted, renamed, or moved before the change.
   -watch
        Return when a match is found and display the journal position.

   -from-journal-pos <journal-id> <change-id>
   -from-journal-id <journal-id>
   -from-change-id <change-id>
        Show changes from the specified journal ID and change ID.
   -from-date <date>
        Show changes starting from the specified ISO-8601 date.
   -from-yesterday
        Show changes starting from the beginning of yesterday.
   -from-today
        Show changes starting from the beginning of today.
   -from-now
        Show changes starting from the current time.

   -to-journal-pos <journal-id> <change-id>
   -to-journal-id <journal-id>
   -to-change-id <change-id>
        Show changes up to the specified journal ID and change ID (exclusive).
   -to-date <date>
        Show changes up to the specified ISO-8601 date (exclusive).
   -to-today
        Show changes up to the start of today (exclusive).
   -to-tomorrow
        Show changes up to the start of tomorrow (exclusive).
   -to-now
        Show changes up to the current time (exclusive).

   -after-journal-pos <journal-id> <change-id>
        Show changes after the specified journal ID and change ID.
   -changed-today
        Show changes from the start of today until the start of tomorrow.
        Same as -from-today -to-tomorrow
   -changed-yesterday
        Show changes from the start of yesterday until the start of today.
        Same as -from-yesterday -to-today


Export options
   -export-csv <out.csv>
   -export-efu <out.efu>
   -export-json <out.json>
   -export-m3u <out.m3u>
   -export-m3u8 <out.m3u8>
   -export-tsv <out.txt>
   -export-txt <out.txt>
        Export to a file using the specified layout.
   -no-header
        Do not output a column header for CSV, EFU and TSV files.
   -no-folder-append-path-separator
        Don't append a trailing path separator to folder paths.
   -utf8-bom
        Store a UTF-8 byte order mark at the start of the exported file.


General options
   -h, -help
        Display this help.

   -instance <name>
        Connect to the specified unique Everything instance.
   -ipc1, -ipc2, -ipc3
        Use IPC version 1, 2 or 3.
   -pause, -more
        Pause after each page of output.
   -timeout <milliseconds>
        Wait up to the specified number of milliseconds for the
        Everything database to load before sending a query.

   -set-run-count <filename> <count>
        Set the run count for the specified filename.
   -inc-run-count <filename>
        Increment the run count for the specified filename by one.
   -get-run-count <filename>
        Display the run count for the specified filename.

   -get-result-count
        Display the result count for the specified search.
   -get-total-size
        Display the total result size for the specified search.
   -get-folder-size <filename>
        Display the total folder size for the specified folder.

   -save-settings
        Save settings to %APPDATA%\voidtools\es\es.ini
   -clear-settings
        Delete %APPDATA%\voidtools\es\es.ini

   -version
        Display the ES major.minor.revision.build version and exit.
   -get-everything-version
        Display the Everything major.minor.revision.build version and exit.
   -exit
        Exit Everything.
        Returns after the Everything process closes.
   -save-db
        Save the Everything database to disk.
        Returns after saving completes.
   -reindex
        Force Everything to reindex.
        Returns after indexing completes.
   -no-result-error
        Set the error level if no results are found.


Notes
    Internal -'s in options can be omitted, eg: -nodigitgrouping
    Switches can start with a / instead of -
    Use double quotes to escape spaces and switches.
    Switches can be disabled by prefixing them with no-, eg: -no-size.
    -instance=1.5a is the same as -instance 1.5a
    Use a ^ prefix or wrap with double quotes (") to escape \ & | > < ^
40294@antlrv E:\DevProjects\LocalProjects\tauriProjects\KeyboardCommand git:main ?3 ~5
>