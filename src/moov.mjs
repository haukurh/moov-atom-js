'use strict';

import {
    readChars,
    findMarker,
    findMarkers,
    strToUint8Array,
    getInt16,
    getInt32,
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
        const dataFormat = readChars(data, 4, 4);
        entries.push({
            size,
            dataFormat,
            reserved: data.slice(8, 14),
            dataReferenceIndex: getUInt16(data, 14),
            ...parseVideoSampleDescription(data.slice(16, size), dataFormat),
            ...parseSoundSampleDescription(data.slice(16, size), dataFormat, size),
        });
        data = data.slice(size);
    }
    return entries;
};

const parseSoundSampleDescription = (data, type) => {
    const availableTables = [
        'NONE', 'raw ', 'twos', 'sowt', 'cvid', 'MAC3', 'MAC6',
        'ima4', 'fl32', 'fl64', 'in24', 'in32', 'ulaw', 'alaw',
        'dvca', 'QDMC', 'QDM2', 'Qclp', '.mp3', 'mp4a', 'ac-3',
    ];
    if (!availableTables.includes(type)) {
        return null;
    }

    const version = getInt16(data, 0);
    let sampleDescription = {
        version,
        revisionLevel: getInt16(data, 2),
        vendor: getInt32(data, 4),
    };

    if (version === 0) {
        sampleDescription = {
            ...sampleDescription,
            numberOfChannels: getInt16(data, 8),
            sampleSize: getInt16(data, 10),
            compressionId: getInt16(data, 12),
            packetSize: getInt16(data, 14),
            sampleRate: getFixedPoint32(data, 16),
            extensions: parseSoundSampleDescriptionExtensions(data.slice(20)),
        };
    } else if (version === 1) {
        sampleDescription = {
            ...sampleDescription,
            numberOfChannels: getInt16(data, 8),
            sampleSize: getInt16(data, 10),
            compressionId: getInt16(data, 12),
            packetSize: getInt16(data, 14),
            sampleRate: getFixedPoint32(data, 16),
            samplesPerPacket: getUInt32(data, 20),
            bytesPerPacket: getUInt32(data, 24),
            bytesPerFrame: getUInt32(data, 28),
            bytesPerSample: getUInt32(data, 32),
            extensions: parseSoundSampleDescriptionExtensions(data.slice(36)),
        };
    } else if (version === 2) {
        // ToDo: implement version 2
    }

    return sampleDescription;
};

const parseVideoSampleDescription = (data, type) => {
    const availableTables = [
        'cvid', 'jpeg', 'smc ', 'rle ', 'rpza', 'kpcd',
        'png ', 'mjpa', 'mjpb', 'SVQ1', 'SVQ3', 'mp4v',
        'avc1', 'dvc ', 'dvcp', 'gif ', 'h263', 'tiff',
        'raw ', '2vuY', 'yuv2', 'v308', 'v408', 'v216',
        'v410', 'v210'
    ];
    if (!availableTables.includes(type)) {
        return null;
    }
    const vendor = getInt32(data, 4);
    return {
        version: getInt16(data, 0),
        revisionLevel: getInt16(data, 2),
        vendor: vendor !== 0 ? readChars(data, 4, 4) : vendor,
        temporalQuality: getInt32(data, 8),
        spatialQuality: getInt32(data, 12),
        width: getInt16(data, 16),
        height: getInt16(data, 18),
        horizontalResolution: getFixedPoint32(data, 20),
        verticalResolution: getFixedPoint32(data, 24),
        dataSize: getInt32(data, 28),
        frameCount: getInt16(data, 32),
        compressorName: readChars(data, 35, data[34]),
        depth: getInt16(data, 66),
        colorTableID: getInt16(data, 68),
        extensions: parseVideoSampleDescriptionExtensions(data.slice(70)),
    }
};

const availableVideoSampleDescriptionTypes = {
    gama: (data) => data,
    fiel: (data) => data,
    mjqt: (data) => data,
    mjht: (data) => data,
    esds: (data) => data,
    // avcC: contains AVCDecoderConfigurationRecord
    avcC: (data) => data,
    pasp: (data) => {
        return {
            size: data.size,
            type: data.type,
            hSpacing: getUInt32(data.data, 0),
            vSpacing: getUInt32(data.data, 4),
        }
    },
    colr: (data) => {
        return {
            size: data.size,
            type: data.type,
            colorParameterType: readChars(data.data, 0, 4),
            primariesIndex: getUInt16(data.data, 4),
            transferFunctionIndex: getUInt16(data.data, 6),
            matrixIndex: getUInt16(data.data, 8),
        }
    },
    clap: (data) => data,
}

const parseSampleDescriptionExtensions = (data, extensionTypes, tables = []) => {
    const size = getUInt32(data, 0);
    tables.push({
        size,
        type: readChars(data, 4, 4),
        data: data.slice(8, size),
    });
    if (size && size < data.length) {
        return parseSampleDescriptionExtensions(data.slice(size), extensionTypes, tables);
    } else {
        return tables
            .filter(entry => Object.keys(extensionTypes).includes(entry.type))
            .map(entry => extensionTypes[entry.type](entry));
    }
};

const parseVideoSampleDescriptionExtensions = (data) => {
    return parseSampleDescriptionExtensions(data, availableVideoSampleDescriptionTypes);
};

const availableSoundSampleDescriptionTypes = {
    0: (data) => data,
    wave: (data) => {
        return {
            size: data.size,
            type: data.type,
            extensions: parseSoundSampleDescriptionExtensions(data.data),
        }
    },
    frma: (data) => data,
    esds: (data) => {
        return {
            size: data.size,
            type: data.type,
            version: getUInt32(data.data, 0),
            elementaryStreamDescriptor: data.data.slice(4),
        }
    },
    chan: (data) => data,
    folw: (data) => data,
}

const parseSoundSampleDescriptionExtensions = (data) => {
    return parseSampleDescriptionExtensions(data, availableSoundSampleDescriptionTypes);
};


const parseSampleTableAtom = (data) => {
    const stbl = getAtomByType(data, 'stbl');
    const stsd = parseSampleDescriptionAtom(stbl.slice(8));
    return {
        size: getUInt32(stbl, 0),
        type: readChars(stbl, 4, 4),
        stsd,
        stts: getAtomByType(stbl, 'stts'),
        ctts: getAtomByType(stbl, 'ctts'),
        cslg: getAtomByType(stbl, 'cslg'),
        stss: getAtomByType(stbl, 'stss'),
        stps: getAtomByType(stbl, 'stps'),
        stsc: getAtomByType(stbl, 'stsc'),
        stsz: getAtomByType(stbl, 'stsz'),
        stco: getAtomByType(stbl, 'stco'),
        stsh: getAtomByType(stbl, 'stsh'),
        sgpd: getAtomByType(stbl, 'sgpd'),
        sbgp: getAtomByType(stbl, 'sbgp'),
        sdtp: getAtomByType(stbl, 'sdtp'),
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
