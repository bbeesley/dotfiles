Brackets-wsSanitizer
========
Bring sanity to your code by keeping white spaces and tabs consistent; white space sanitizer. This is accomplished by leveraging Brackets white spaces and tabs settings.

wsSanitizer goes really well with https://github.com/DennisKehrig/brackets-show-whitespace.

Features
=======
* Trims trailing whitespaces
* Ensures newline at file end
* Respects your spacing settings (tabs or spaces) including your units (2 spaces, 4 spaces, etc.)

Details
=======
For example, if Brackets is configured to use white spaces, wsSanitizer will convert all leading tabs to white spaces. wsSanitizer will also use Brackets white spaces settings so that if Brackets is configured to use 4 spaces, all leading tabs will be converted to 4 spaces.

Conversely, if you have Brackets configured to use tabs, then all leading white spaces will be converted to tabs. It will also take into account the amount of spaces in each tab . So that if Brackets is configured to have 4 spaces in a tab, then wsSanitizer will convert every 4 leading spaces to a single tab.

When does all this work happen? Upon saving file changes.

How to...
=======

Enable/Disable:
![enable/disable ss](https://raw.githubusercontent.com/MiguelCastillo/Brackets-wsSanitizer/master/screenshot.png)

Credits
=======

Thanks to Dimitar Bonev for his work on https://github.com/dsbonev/whitespace-normalizer

