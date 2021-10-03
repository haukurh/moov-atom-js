# moovAtomJs

A JavaScript library that reads the infamous "movie atom" that resides inside the mp4 and mov containers.

## Getting started

The main aspect of this project is to implement in browser. You can include in your project from the CDN.

### Import the library

Grab the library from the CDN

```html
<script src="https://cdn.haukurh.dev/moov/v0.0.1/moov-min.js" integrity="sha384-pkO4xD91SrjOTQ3soV4iHVIgix94ZQiuJjRiqgD47ZrNgR4bgrqB4fY7s+BukTm6" crossorigin="anonymous"></script>
```

or import as a JavaScript module

```html
<script type="module">
    import { readMovieAtom } from 'https://cdn.haukurh.dev/moov/v0.0.1/moov-min.mjs';
    // Do stuff
</script>
```

## Example usage

ES6 module way

```html
<form>
    <input type="file" id="fileInput">
</form>

<script type="module">
    import { readMovieAtom } from 'https://cdn.haukurh.dev/moov/v0.0.1/moov-min.mjs';

    const readFileIntoUint8Array = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(new Uint8Array(e.target.result));
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    };

    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', (event) => {
        readFileIntoUint8Array(event.target.files[0])
            .then((file) => {
                const moovAtom = readMovieAtom(file);
                console.log(moovAtom);
            });
    });
</script>
```

Standard usage

```html
<form>
  <input type="file" id="fileInput">
</form>

<script src="https://cdn.haukurh.dev/moov/v0.0.1/moov-min.js" integrity="sha384-vKZ0J8C4NGSCwbmWCwiiG6I8Nqoseh0Hr2216MCy8GkVNbOrM0/GcqmpNS54YmAT" crossorigin="anonymous"></script>
<script>
    const readFileIntoUint8Array = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(new Uint8Array(e.target.result));
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    };

    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', (event) => {
        readFileIntoUint8Array(event.target.files[0])
          .then((file) => {
            const moovAtom = moovAtomJS.readMovieAtom(file);
            console.log(moovAtom);
          });
    });
</script>
```

## How it works

The `readMovieAtom` function takes in a mp4/mov file as a Uint8Array then finds the moov atom and parses it.

It then dumps out the moov atom as a JavaScript object, one with the main info about the movie and then all the tracks
in it.

Here's an example of a parsed video file in JSON format, some fields have been redacted in order to keep the example short.
The 

```json
{
    "movie": {
        "size": 108,
        "type": "mvhd",
        "version": 0,
        "flags": 0,
        "creationTime": "2021-09-23T14:37:29.000Z",
        "modificationTime": "2021-09-23T14:37:29.000Z",
        "timeScale": 1000,
        "duration": 12875,
        "preferredRate": 1,
        "preferredVolume": 1,
        "reserved": 0,
        "matrixStructure": {},
        "previewTime": 0,
        "previewDuration": 0,
        "posterTime": 0,
        "selectionTime": 0,
        "selectionDuration": 0,
        "currentTime": 0,
        "nextTrackID": 3
    },
    "tracks": [
        {
            "size": 4579,
            "type": "trak",
            "header": {
                "size": 92,
                "type": "tkhd",
                "version": 0,
                "flags": {
                    "0": 0,
                    "1": 0,
                    "2": 3
                },
                "creationTime": "2021-09-23T14:37:29.000Z",
                "modificationTime": "2021-09-23T14:37:29.000Z",
                "trackID": 1,
                "duration": 12875,
                "layer": 0,
                "alternateGroup": 0,
                "volume": 0,
                "matrixStructure": {},
                "trackWidth": 1920,
                "trackHeight": 1080
            },
            "media": {
                "size": 4443,
                "type": "mdia",
                "mdhd": {
                    "size": 32,
                    "type": "mdhd",
                    "version": 0,
                    "flags": {},
                    "creationTime": "2021-09-23T14:37:29.000Z",
                    "modificationTime": "2021-09-23T14:37:29.000Z",
                    "timeScale": 12288,
                    "duration": 158208,
                    "language": "eng",
                    "quality": 0
                },
                "hdlr": {
                    "size": 45,
                    "type": "hdlr",
                    "version": 0,
                    "flags": {},
                    "componentType": "",
                    "componentSubType": "vide",
                    "componentManufacturer": {},
                    "componentFlags": {},
                    "componentFlagsMask": {},
                    "componentName": "VideoHandler"
                },
                "minf": {
                    "size": 4358,
                    "type": "minf",
                    "hdlr": null,
                    "dinf": {},
                    "stbl": {}
                }
            }
        },
        {
            "size": 4553,
            "type": "trak",
            "header": {
                "size": 92,
                "type": "tkhd",
                "version": 0,
                "flags": {},
                "creationTime": "2021-09-23T14:37:29.000Z",
                "modificationTime": "2021-09-23T14:37:29.000Z",
                "trackID": 2,
                "duration": 12872,
                "layer": 0,
                "alternateGroup": 1,
                "volume": 1,
                "matrixStructure": {},
                "trackWidth": 0,
                "trackHeight": 0
            },
            "media": {
                "size": 4417,
                "type": "mdia",
                "mdhd": {
                    "size": 32,
                    "type": "mdhd",
                    "version": 0,
                    "flags": {},
                    "creationTime": "2021-09-23T14:37:29.000Z",
                    "modificationTime": "2021-09-23T14:37:29.000Z",
                    "timeScale": 48000,
                    "duration": 617824,
                    "language": "eng",
                    "quality": 0
                },
                "hdlr": {
                    "size": 45,
                    "type": "hdlr",
                    "version": 0,
                    "flags": {},
                    "componentType": "",
                    "componentSubType": "soun",
                    "componentManufacturer": {},
                    "componentFlags": {},
                    "componentFlagsMask": {},
                    "componentName": "SoundHandler"
                },
                "minf": {
                    "size": 4332,
                    "type": "minf",
                    "hdlr": null,
                    "dinf": {
                        "size": 36,
                        "type": "dinf",
                        "dref": {
                            "size": 28,
                            "type": "dref",
                            "version": 0,
                            "flags": {},
                            "numberOfEntries": 1,
                            "dataReferences": []
                        }
                    },
                    "stbl": {
                        "size": 4272,
                        "type": "stbl",
                        "stsd": {
                            "size": 106,
                            "type": "stsd",
                            "version": 0,
                            "flags": {},
                            "numberOfEntries": 1,
                            "sampleDescriptionTable": []
                        }
                    },
                    "smhd": {
                        "size": 16,
                        "type": "smhd",
                        "version": 0,
                        "flags": {},
                        "balance": 0,
                        "reserved": {}
                    }
                }
            }
        }
    ]
}
```
