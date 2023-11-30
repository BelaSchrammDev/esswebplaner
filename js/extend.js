function extendTable() {
    for (let index = 0; index < tableCPU.length; index++) {
        const element = tableCPU[index];
        extendABMESSUNG(element);
        extendSTATUS(element);
        extendKENNWORT(element);
        extendNENNDURCHMESSER_STEIGUNG(element);
        extendLAEPPDORN_RawMaterial(element);
        extendLaeppBohr(element);
        element['LAEPPDATE'] = getDateFromGER(element['T_LAEPP']);
        element['ROHTEILDATE'] = getDateFromGER(element['T_R']);
        element['BELEGDATE'] = new Date(element['BELEGDATUM']);
        extendROHTEIL_KW(element);
    }
}


function extendROHTEIL_KW(element) {
    element.ROHTEILWOCHE = getWeekNumber(element.ROHTEILDATE);
}


function getWeekNumber(sourceDate) {
    let date = new Date(sourceDate);
    let dayNum = date.getUTCDay() - 3;
    if (dayNum < 0) dayNum += 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    let yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7) - 1;
};


function extendLaeppBohr(element) {
    if (element['threadPropertys']) {
        let thProp = element.threadPropertys;
        if (thProp['diameter'] && thProp['pitch']) {
            let bohrer = thProp.diameter - (2 * thProp.pitch);
            if (thProp.diameter > 20) bohrer -= 5;
            else bohrer -= 3;
            element.LDBOHRDURCHMESSER = bohrer.toFixed(2);
            if (element.LDBOHRDURCHMESSER < 1.6) element.LDBOHRDURCHMESSER = 1.6;
        }
    }
}


function extendKENNWORT(element) {
    element.KENNWORT_CPU = element['KENNWORT'];
}


function extendSTATUS(element) {
    const tableKennwort = {
        "S L LD H R": "Rohlinge",
        "S L LD H": "Härterei",
        "S L LD": "Läppdorne",
        "S L": "Läppen",
        "S": "Schleifen",
    };
    if (tableKennwort[element['KENNWORT']]) {
        element['STATUS'] = tableKennwort[element['KENNWORT']];
    } else {
        element['STATUS'] = '-?-';
    }
}


function extendABMESSUNG(element) {
    const realRohteilDiameters = ['22', '32', '38', '45', '53', '63', '71',];
    if (element['ABMESSUNG']) {
        const abmessung = element['ABMESSUNG'];
        if (abmessung[0] == '�') {
            const rohteilStrings = element['ABMESSUNG'].split(' ');
            if (rohteilStrings.length > 0 && realRohteilDiameters.includes(rohteilStrings[1])) {
                element.ROHTEILDURCHMESSER = '&Oslash;' + rohteilStrings[1];
                element.ABMESSUNG_PUR = abmessung.substring(abmessung.indexOf(' ', 3) + 1);
            } else {
                element.ROHTEILDURCHMESSER = '&Oslash;' + abmessung.substring(1, abmessung.indexOf(' '));
                if (element.ROHTEILDURCHMESSER.length == 8 || element.ROHTEILDURCHMESSER.length == 9) element.ROHTEILDURCHMESSER = '';
                element.ABMESSUNG_PUR = abmessung.substring(abmessung.indexOf(' ') + 1);
            }
        }
    }
}


const threatPitchM = {
    4: 0.7,
    4.5: 0.75,
    5: 0.8,
    6: 1,
    7: 1,
    8: 1.25,
    9: 1.25,
    10: 1.5,
    11: 1.5,
    12: 1.75,
    14: 2,
    16: 2,
    18: 2.5,
    20: 2.5,
    22: 2.5,
    24: 3,
    27: 3,
    30: 3.5,
    33: 3.5,
    36: 4,
    39: 4,
}


const threatPitchRG = {
    "1/16": 0.907,
    "1/8": 0.907,
    "1/4": 1.337,
    "3/8": 1.337,
    "1/2": 1.814,
    "5/8": 1.814,
    "3/4": 1.814,
    "7/8": 1.814,
    "1": 2.309,
}


const threatDiameterRG = {
    "1/16": 6.84,
    "1/8": 9.73,
    "1/4": 13.16,
    "3/8": 16.66,
    "1/2": 20.95,
    "5/8": 22.91,
    "3/4": 26.44,
    "7/8": 30.20,
    "1": 33.25,
}


function getThreadPropertys(abmessung) {
    //------------------------------------------------------------------------------------------------------------------------
    function getSubstrHS(text) { let pos = text.search(/[\s-]/); if (pos == -1) return text; return text.substring(0, pos); }
    function getSubstrMinus(text) { let pos = text.search(/[-]/); if (pos == -1) return text; return text.substring(0, pos); }
    function getSubstrX(text) { let pos = text.search(/[x]/); if (pos == -1) return text; return text.substring(0, pos); }
    //------------------------------------------------------------------------------------------------------------------------
    let threadPropertys = new Object();
    const astr = abmessung.trim();
    threadPropertys.type = astr.substring(0, astr.indexOf(' '));
    if (threadPropertys.type.startsWith('UN')) threadPropertys.type = 'UN';
    if (threadPropertys.type.startsWith('BS')) threadPropertys.type = 'BS';
    if (threadPropertys.type.startsWith('M')) threadPropertys.type = 'M';
    let propertyStr = astr.substring(astr.indexOf(' ')).trim();
    //------------------------------------------------------------------------------------------------------------------------
    // unbekanntes Gewinde
    if (/[0-9]/.test(threadPropertys.type[0])) { return undefined; }
    //------------------------------------------------------------------------------------------------------------------------
    // Pg
    // Fg
    // BS
    // FÜR BS geht vielleicht auch UN
    //------------------------------------------------------------------------------------------------------------------------
    if (threadPropertys.type == 'UN') {
        let propertySubString = getSubstrMinus(propertyStr);
        if (propertySubString.includes('/')) {
            let factors = propertySubString.trim().split('/');
            if (factors.length > 1) {
                let firstFac = +factors[0];
                let secondFac = +factors[1];
                if (factors[0].includes(' ')) {
                    let firstFactors = factors[0].split(' ');
                    firstFac = +firstFactors[1];
                    if (firstFactors[0] == '1') firstFac += secondFac;
                    if (firstFactors[0] == '2') firstFac += secondFac * 2;
                }
                threadPropertys.diameter = (25.4 / secondFac * firstFac).toFixed(2);
            }
        }
        else if (propertySubString == '1') threadPropertys.diameter = 25.4;
        else if (propertySubString.startsWith('0.') || propertySubString.startsWith('1.')) {
            threadPropertys.diameter = (25.4 / parseFloat(propertySubString)).toFixed(2);
        }
        else return undefined;
        propertySubString = getSubstrHS(propertyStr.substring(propertyStr.indexOf('-') + 1));
        threadPropertys.pitch = (25.4 / propertySubString).toFixed(4);
    }
    else if (threadPropertys.type == 'R' || threadPropertys.type == 'G') {
        let propertySubString = getSubstrHS(propertyStr);
        if (threatDiameterRG[propertySubString]) threadPropertys.diameter = threatDiameterRG[propertySubString];
        else threadPropertys.diameter = '-?-';
        if (threatPitchRG[propertySubString]) threadPropertys.pitch = threatPitchRG[propertySubString];
        else threadPropertys.pitch = '-?-';
    }
    else if (threadPropertys.type == 'M' || threadPropertys.type == 'Tr') {
        propertyStr = propertyStr.replaceAll(',', '.');
        if (propertyStr.includes('x')) {
            threadPropertys.diameter = getSubstrX(propertyStr);
            threadPropertys.pitch = getSubstrHS(propertyStr.substring(propertyStr.indexOf('x') + 1));
        }
        else {
            let propertySubString = getSubstrHS(propertyStr);
            if (threatPitchM[propertySubString]) threadPropertys.pitch = threatPitchM[propertySubString];
            else threadPropertys.pitch = '-?-';
            threadPropertys.diameter = propertySubString;
        }
    }
    else return undefined;
    return threadPropertys;
}


function extendNENNDURCHMESSER_STEIGUNG(element) {
    if (element.ABMESSUNG_PUR) {
        setGewindeTypePropertys(element, getThreadPropertys(element.ABMESSUNG_PUR));
    }
}


function setGewindeTypePropertys(element, propertys) {
    if (propertys) {
        element.threadPropertys = propertys;
        element.GEWINDETYPE = propertys.type;
        element.NENNDURCHMESSER = propertys.diameter ? +propertys.diameter : '??';
        element.STEIGUNG = propertys.pitch ? +propertys.pitch : '??';
    }
    else {
        element.GEWINDETYPE = '???';
        element.NENNDURCHMESSER = '??';
        element.STEIGUNG = '??';
    }
}


function extendLAEPPDORN_RawMaterial(element) {
    if (element['threadPropertys'] && element.threadPropertys['diameter']) {
        element.LDROHDURCHMESSER = 'Klein';
        if (element.threadPropertys.diameter >= 24.8) element.LDROHDURCHMESSER = 'Mittel';
        if (element.threadPropertys.diameter >= 34.8) element.LDROHDURCHMESSER = 'Groß';
    }
    else element.LDROHDURCHMESSER = '?';
}


function getDateFromGER(dateString) {
    const dateStrings = dateString.split('.');
    if (dateStrings.length > 2) {
        if (dateStrings[2].length == 2) dateStrings[2] = '20' + dateStrings[2];
        return new Date(+dateStrings[2], +dateStrings[1] - 1, +dateStrings[0]);
    }
    return new Date('2022', '0', '1');
}