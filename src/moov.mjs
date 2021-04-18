'use strict';

import {
    readChars,
    findMarker,
    findMarkers,
    strToUint8Array,
    getUInt16,
    getUInt32,
    getFixedPoint16,
    getFixedPoint32,
} from './binary.mjs';

// https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25642
// https://github.com/nadr0/mp4-metadata/blob/master/source/index.js

const intToDate = (integer) => {
    // moov atom time is in seconds since midnight, January 1, 1904,
    // so we have to subtract the difference between Epoch time,
    // and multiply by 1000 to get it in milliseconds for js Date
    return new Date(((integer - 2082844800) * 1000));
}

const getAtomByType = (data, atom) => {
    const pos = findMarker(data, atom);
    if (!pos) {
        return null;
    }
    const startPosition = pos - 4;
    const size = getUInt32(data, startPosition);
    return data.slice(startPosition, startPosition + size);
}

const findMovieAtom = (data) => {
    const searchFirstKB = 32 * 1000;
    const moovMarker = strToUint8Array('moov');
    const needle = moovMarker.toString();

    // Search the first x KB of file, in case the moov atom has been placed there.
    for (let i = 0; i < searchFirstKB; i++) {
        if ((data.slice(i, i + 4)).toString() === needle) {
            return getMovieAtom(data, i - 4);
        }
    }

    // Search entire file backwards, the moov atom often resides at the end of file.
    for (let i = data.length; i >= 0; i--) {
        if ((data.slice(i, i + 4)).toString() === needle) {
            return getMovieAtom(data, i - 4);
        }
    }

    throw new Error('Unable to find moov atom');
}

const getMovieAtom = (data, position) => {
    const size = getUInt32(data, position);
    return data.slice(position, position + size);
}

const parseHandlerReferenceAtom = (mediaAtom) => {
    const hdlr = getAtomByType(mediaAtom, 'hdlr');
    return !hdlr ? null : {
        size: getUInt32(hdlr, 0),
        type: readChars(hdlr, 4, 4),
        version: hdlr[8],
        flags: hdlr.slice(9, 12),
        componentType: readChars(hdlr, 12, 4),
        componentSubType: readChars(hdlr, 16, 4),
        componentManufacturer: hdlr.slice(20, 24),
        componentFlags: hdlr.slice(24, 28),
        componentFlagsMask: hdlr.slice(28, 32),
        componentName: readChars(hdlr, 32, (getUInt32(hdlr, 0) - 32)),
    };
};

const parseMediaHeader = (mediaAtom) => {
    const mdhd = getAtomByType(mediaAtom, 'mdhd');
    return !mdhd ? null : {
        size: getUInt32(mdhd, 0),
        type: readChars(mdhd, 4, 4),
        version: mdhd[8],
        flags: mdhd.slice(9, 12),
        creationTime: intToDate(getUInt32(mdhd, 12)),
        modificationTime: intToDate(getUInt32(mdhd, 16)),
        timeScale: getUInt32(mdhd, 20),
        duration: getUInt32(mdhd, 24),
        language: parseLang(mdhd.slice(28, 30)), // readChars(mdhd, 28, 2),
        quality: getUInt16(mdhd, 30),
    };
};

const parseSoundMediaInformationHeaderAtoms = (mediaInformationAtom) => {
    const smhd = getAtomByType(mediaInformationAtom, 'smhd');
    return !smhd ? null : {
        size: getUInt32(smhd, 0),
        type: readChars(smhd, 4, 4),
        version: smhd[8],
        flags: smhd.slice(9, 12),
        balance: getUInt16(smhd,12),
        reserved: smhd.slice(14),
    };
};

const parseGeneralStructureOfASampleDescription = (data, numberOfEntries) => {
    const entries = [];
    for (let i = 0; i < numberOfEntries; i++) {
        const size = getUInt32(data, 0);
        entries.push({
            size,
            dataFormat: getUInt32(data, 4),
            reserved: data.slice(8, 14),
            dataReferenceIndex: getUInt16(data, 14),
            additionalData: readChars(data, 18, size),
        });
        data = data.slice(size);
    }
    return entries;
};

const parseSampleTableAtom = (data) => {
    const stbl = getAtomByType(data, 'stbl');
    return {
        size: getUInt32(stbl, 0),
        type: readChars(stbl, 4, 4),
        stsd: parseSampleDescriptionAtom(stbl.slice(8)),
    };
};

const parseSampleDescriptionAtom = (data) => {
    const stsd = getAtomByType(data, 'stsd');
    const size = getUInt32(stsd, 0);
    const numberOfEntries = getUInt32(stsd, 12);
    return {
        size,
        type: readChars(stsd, 4, 4),
        version: stsd[8],
        flags: stsd.slice(9, 12),
        numberOfEntries,
        sampleDescriptionTable: parseGeneralStructureOfASampleDescription(stsd.slice(16), numberOfEntries),
    };
};

const parseMediaInformationAtom = (mediaAtom, subtype) => {
    const minf = getAtomByType(mediaAtom, 'minf');
    if (!minf) {
        return null;
    }
    const data = {
        size: getUInt32(minf, 0),
        type: readChars(minf, 4, 4),
        hdlr: parseHandlerReferenceAtom(minf),
        dinf: parseDataInformationAtom(minf),
        stbl: parseSampleTableAtom(minf),
    }
    switch (subtype) {
        case 'vide':
            break;
        case 'soun':
            data.smhd = parseSoundMediaInformationHeaderAtoms(minf);
            break;
        default:
            break;
    }
    return data;
}

const parseDataReferenceAtoms = (data, entriesLength) => {
    const payload = [];
    let ref = data;
    for(let i = 0; i < entriesLength; i++) {
        const size = getUInt32(ref, 0);
        payload.push({
            size: size,
            type: readChars(ref, 4, 4),
            version: ref[8],
            flags: ref.slice(9, 12),
            data: ref.slice(12, size),
        });
        ref = ref.slice(size);
    }
    return payload;
};

const parseDataInformationAtom = (mediaAtom) => {
    const dinf = getAtomByType(mediaAtom, 'dinf');
    if (!dinf) {
        return null;
    }
    const numberOfEntries = getUInt32(dinf, 20);
    return {
        size: getUInt32(dinf, 0),
        type: readChars(dinf, 4, 4),
        dref: {
            size: getUInt32(dinf, 8),
            type: readChars(dinf, 12, 4),
            version: dinf[16],
            flags: dinf.slice(17, 20),
            numberOfEntries: numberOfEntries,
            dataReferences: parseDataReferenceAtoms(dinf.slice(24), numberOfEntries),
        },
    };
};

const parseMediaAtom = (trakAtom) => {
    const mdia = getAtomByType(trakAtom, 'mdia');
    if (!mdia) {
        return null;
    }

    const size = getUInt32(mdia, 0);
    const type = readChars(mdia, 4, 4);
    const mdhd = parseMediaHeader(mdia);
    const hdlr = parseHandlerReferenceAtom(mdia);

    return !mdia ? null : {
        size: size,
        type: type,
        mdhd: mdhd,
        hdlr: hdlr,
        minf: parseMediaInformationAtom(mdia, hdlr.componentSubType)
    };
};

const parseMovieHeader = (moovAtom) => {
    const mvhd = getAtomByType(moovAtom, 'mvhd');
    return !mvhd ? null : {
        size: getUInt32(mvhd, 0),
        type: readChars(mvhd, 4, 4),
        version: mvhd[8],
        flags: 0,
        creationTime: intToDate(getUInt32(mvhd, 12)),
        modificationTime: intToDate(getUInt32(mvhd, 16)),
        timeScale: getUInt32(mvhd, 20),
        duration: getUInt32(mvhd, 24),
        preferredRate: getFixedPoint32(mvhd, 28),
        preferredVolume: getFixedPoint16(mvhd, 32),
        reserved: 0,
        matrixStructure: mvhd.slice(40, 44),
        previewTime: getUInt32(mvhd, 80),
        previewDuration: getUInt32(mvhd, 84),
        posterTime: getUInt32(mvhd, 88),
        selectionTime: getUInt32(mvhd, 92),
        selectionDuration: getUInt32(mvhd, 96),
        currentTime: getUInt32(mvhd, 100),
        nextTrackID: getUInt32(mvhd, 104),
    };
};

const parseTrackHeader = (trakAtom) => {
    const tkhd = getAtomByType(trakAtom, 'tkhd');
    return !tkhd ? null : {
        size: getUInt32(tkhd, 0),
        type: readChars(tkhd, 4, 4),
        version: tkhd[8],
        flags: tkhd.slice(9, 12),
        creationTime: intToDate(getUInt32(tkhd, 12)),
        modificationTime: intToDate(getUInt32(tkhd, 16)),
        trackID: getUInt32(tkhd, 20),
        duration: getUInt32(tkhd, 28),
        layer: getUInt16(tkhd, 40),
        alternateGroup: getUInt16(tkhd, 42),
        volume: getFixedPoint16(tkhd, 44),
        matrixStructure: tkhd.slice(48, 84),
        trackWidth: getFixedPoint32(tkhd, 84),
        trackHeight: getFixedPoint32(tkhd, 88),
    };
}

const parseTrackAtom = (trakAtom) => {
    return {
        size: getUInt32(trakAtom, 0),
        type: readChars(trakAtom, 4, 4),
        header: parseTrackHeader(trakAtom),
        media: parseMediaAtom(trakAtom),
    };
};

const getTrackAtoms = (moovAtom) => {
    return findMarkers(moovAtom, 'trak').map((track) => {
        const position = track - 4;
        const size = getUInt32(moovAtom, position);
        return parseTrackAtom(moovAtom.slice(position, position + size));
    });
};

export const readMovieAtom = (file) => {
    const moovAtom = findMovieAtom(file);

    // Hint to JS that it can discard the whole file
    file = null;

    return {
        movie: parseMovieHeader(moovAtom),
        tracks: getTrackAtoms(moovAtom),
    };
};

const parseLang = (arr) => {
    const bit16 = getUInt16(arr, 0);
    const char1 = ((bit16 & 0xffe0) >> 10) + 0x60;
    const char2 = ((bit16 & 0x03e0) >> 5) + 0x60;
    const char3 = ((bit16 & 0x001f)) + 0x60;
    return [char1, char2, char3].map((entry) => String.fromCodePoint(entry)).join('');
};
