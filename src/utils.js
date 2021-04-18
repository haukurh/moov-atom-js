
const gcd = (x, y) => {
    x = Math.abs(x);
    y = Math.abs(y);
    while(y) {
        const t = y;
        y = x % y;
        x = t;
    }
    return x;
}

const secToTime = (sec) => {
    const data = {
        totalSeconds: sec,
        hours: Math.floor(sec / 3600),
        minutes: Math.floor(sec / 60),
        seconds: parseFloat((sec % 60).toFixed(2)),
    };

    const hh = data.hours.toString().padStart(2, '0');
    const hm = data.minutes.toString().padStart(2, '0');
    const hs = data.seconds < 10 ? `0${data.seconds.toString()}` : data.seconds.toString();
    data.string = `${hh}:${hm}:${hs}`;
    return data;
};
