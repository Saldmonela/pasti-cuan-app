// Menurunkan nilai_usd harian (versi Tracker_LP_v3) yang konsisten dengan angka acuan PRD.
// Hari tanpa arus memakai nilai Laporan Harian, kecuali 31 Okt, 4 Nov, 5 Nov (dibuat selisih >3%
// supaya pratinjau impor menampilkan 5 peringatan seperti AC-06-01).
const LAP_USD=[397.76,394.73,616.996,679.52,725.594,769.322,760.732,797.727,808.245,838.769,852.02,1280.777,1292.706,1313.321,1218.616,1283.906,1334.117,1338.456,1347.84,1380.485,1465.825,1378.526,1450.647,1445.106,2098.775,2132.23,2068.376,2058.185,2024.458,2064.379];
const golden={Faiz:155.71,Hafiz:97.38,Salman:813.74,Rezki:827.45};
const P14=(golden.Faiz-10)/90;              // Faiz: 0.9*100*P + 10
const U14=2076.53/P14;
const NAV27=100*P14/golden.Hafiz;           // Hafiz rugi, nilai bersih = unit*P
const U7=400+200/1.0425+300/NAV27;
const NAV8=(2161.13-725)/U7;
const rezkiUnits=(golden.Rezki-70)/0.9/P14; // 0.9g+70 = net
const NAV13=200/(rezkiUnits-100-200/1.0425-200/NAV8);
const U8=U7+525/NAV8+200/NAV8;
const v=LAP_USD.slice();
v[2]=1.0425*400+200;
v[11]=NAV27*(400+200/1.0425)+300;
v[15]=LAP_USD[15]*0.964; v[19]=LAP_USD[19]*1.035; v[20]=LAP_USD[20]*0.964;
v[22]=1438.24; v[23]=2161.13; v[28]=NAV13*U8+200; v[29]=2076.53;
console.log(JSON.stringify(v.map(x=>Math.round(x*100)/100)));
console.log({P14,U14,NAV27,NAV8,NAV13,U7,U8,salmanUnits:100+200/NAV27+525/NAV8, salmanNet:(100+200/NAV27+525/NAV8)*P14});
