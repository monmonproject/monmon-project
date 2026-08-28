// helpers/dateHelper.js
//
// Satu-satunya sumber waktu "sekarang" untuk seluruh service. Dilarang
// memanggil `new Date()` langsung di dalam service (AGENTS.md §1b no. 5).
// Di test, fungsi `now()` di-mock lewat jest.spyOn supaya waktu bisa
// "dibekukan" (lihat TESTING.md §6).

function now() {
    return new Date();
}

module.exports = { now };