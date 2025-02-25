$(document).ready(async function () {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentDate = today.getDate();
    // Gunakan bulan saat ini
    const selectedMonth = today.getMonth() + 1;
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    let selectedCityId = "1635"; // Default: Mojokerto
    let selectedCityName = "Mojokerto";
    let cityData = [];
    let currentSchedule = []; // Jadwal Bulanan
    // Variabel untuk menghindari pemutaran audio adzan berulang
    let lastAdzanMinute = -1;
    let lastAdzanPrayer = "";
    
    // Set default tampilan ke harian
    $("#viewBulan").hide();
    $("#viewHari").show();
    
    try {
        const response = await fetch("https://api.myquran.com/v2/sholat/kota/semua");
        const data = await response.json();
        cityData = data.data;
        cityData.forEach(city => {
            $('#citySelect').append(new Option(city.lokasi, city.id));
        });
        $('#citySelect').select2({ placeholder: "Pilih Kota", allowClear: true });
        detectLocation();
    } catch (error) {
        console.error("Gagal mengambil daftar kota:", error);
    }
    
    $('#tampilkan').click(function () {
        const cityId = $('#citySelect').val();
        const cityText = $("#citySelect option:selected").text();
        if (!cityId) return alert("Pilih kota terlebih dahulu");
        fetchSchedule(cityId, selectedMonth, cityText);
    });
    
    async function fetchSchedule(cityId, month, cityText) {
        const monthName = months[month - 1];
        $('#displaySelection').text(`Jadwal Sholat & Imsakiyah untuk ${cityText}, Bulan ${monthName} ${currentYear}`);
        try {
            const response = await fetch(`https://api.myquran.com/v2/sholat/jadwal/${cityId}/${currentYear}/${month}`);
            const data = await response.json();
            if (!data.status) throw new Error("Data tidak tersedia");
            currentSchedule = data.data.jadwal;
            // Tampilkan sesuai view yang aktif
            if ($('input[name="viewOption"]:checked').val() === 'hari') {
                const todaySchedule = currentSchedule.find(item => parseInt(item.tanggal.match(/\d+/)[0]) === currentDate);
                if (todaySchedule) {
                    displayDailyBox(todaySchedule);
                } else {
                    $("#viewHari").html("<p class='text-center mt-3'>Jadwal untuk hari ini tidak ditemukan.</p>");
                }
            } else {
                displayTable(currentSchedule, month);
            }
        } catch (error) {
            alert("Terjadi kesalahan saat mengambil jadwal sholat: " + error.message);
        }
    }
    
    function displayTable(schedule, month) {
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        let html = `<div class="table-responsive">
          <table class="table table-bordered text-center">
            <thead>
              <tr>
                <th>Hari & Tanggal</th>
                <th>Imsak</th>
                <th>Subuh</th>
                <th>Terbit</th>
                <th>Dhuha</th>
                <th>Dzuhur</th>
                <th>Ashar</th>
                <th>Maghrib</th>
                <th>Isya</th>
              </tr>
            </thead>
            <tbody>`;
        schedule.forEach(day => {
            const dayNumber = parseInt(day.tanggal.match(/\d+/)[0]);
            const dateObj = new Date(currentYear, month - 1, dayNumber);
            const dayName = dayNames[dateObj.getDay()];
            const isToday = (dayNumber === currentDate && month === (today.getMonth() + 1));
            html += `<tr class="${isToday ? 'highlight-today' : ''}">
                <td>${dayName}, ${dayNumber}</td>
                <td>${day.imsak}</td>
                <td>${day.subuh}</td>
                <td>${day.terbit}</td>
                <td>${day.dhuha}</td>
                <td>${day.dzuhur}</td>
                <td>${day.ashar}</td>
                <td>${day.maghrib}</td>
                <td>${day.isya}</td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
        $("#viewBulan").html(html);
    }
    
    // Tampilkan jadwal harian dengan tanda ceklis jika sudah lewat
    function displayDailyBox(schedule) {
        let html = `<div class="daily-box">
                      <h4>Jadwal Sholat Hari ${schedule.tanggal}</h4>`;
        const now = new Date();
        const prayers = [
            { label: "Imsak", key: "imsak" },
            { label: "Subuh", key: "subuh" },
            { label: "Terbit", key: "terbit" },
            { label: "Duha", key: "dhuha" },
            { label: "Dzuhur", key: "dzuhur" },
            { label: "Ashar", key: "ashar" },
            { label: "Maghrib", key: "maghrib" },
            { label: "Isya", key: "isya" }
        ];
        prayers.forEach(prayer => {
            const timeStr = schedule[prayer.key];
            let checkMark = "";
            if (timeStr) {
                const [pHour, pMinute] = timeStr.split(":").map(Number);
                const prayerTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), pHour, pMinute);
                if (now >= prayerTime) {
                    checkMark = " &#10003;";
                }
            }
            html += `<div class="daily-row">
                        <div class="daily-label">${prayer.label}</div>
                        <div class="daily-time">${timeStr}${checkMark}</div>
                     </div>`;
        });
        html += `</div>`;
        $("#viewHari").html(html);
    }
    
    // Event listener untuk radio button view selector
    $('input[name="viewOption"]').change(function () {
      const view = $(this).val();
      if (view === "hari") {
        if (currentSchedule.length > 0) {
            const filtered = currentSchedule.find(item => parseInt(item.tanggal.match(/\d+/)[0]) === currentDate);
            if (filtered) {
                displayDailyBox(filtered);
            } else {
                $("#viewHari").html("<p class='text-center mt-3'>Jadwal untuk hari ini tidak ditemukan.</p>");
            }
        }
        $("#viewHari").show();
        $("#viewBulan").hide();
      } else {
        $("#viewBulan").show();
        $("#viewHari").hide();
        if (currentSchedule.length > 0) {
            displayTable(currentSchedule, selectedMonth);
        }
      }
    });
    
    // Update clock dan trigger alert setiap detik
    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
        $('#currentTimeDisplay').text(timeStr);
        updatePrayerAlert();
    }
    updateClock();
    setInterval(updateClock, 1000);
    
    // Fungsi untuk trigger alert dan audio adzan, termasuk imsak
    function updatePrayerAlert() {
        if (!currentSchedule.length) {
            $("#prayerAlert").html("");
            return;
        }
        // Sertakan "imsak" dalam pengecekan
        const prayersToCheck = ["imsak", "subuh", "dzuhur", "ashar", "maghrib", "isya"];
        const now = new Date();
        let matchedPrayer = null;
        const todaySchedule = currentSchedule.find(item => parseInt(item.tanggal.match(/\d+/)[0]) === now.getDate());
        if (!todaySchedule) {
            $("#prayerAlert").html("");
            return;
        }
        prayersToCheck.forEach(prayer => {
            const prayerTimeStr = todaySchedule[prayer];
            if (prayerTimeStr) {
                const [hourStr, minuteStr] = prayerTimeStr.split(":");
                const prayerHour = parseInt(hourStr);
                const prayerMinute = parseInt(minuteStr);
                if (now.getHours() === prayerHour && now.getMinutes() === prayerMinute) {
                    matchedPrayer = prayer;
                }
            }
        });
        if (matchedPrayer) {
            if (now.getMinutes() !== lastAdzanMinute || matchedPrayer !== lastAdzanPrayer) {
                // Untuk imsak, audio menggunakan "imsak.mp3"
                // Untuk subuh, audio menggunakan "azan.mp3"
                // Untuk lainnya, audio menggunakan "adzhan.mp3"
                let audioSrc;
                if (matchedPrayer === "imsak") {
                    audioSrc = "imsak.mp3";
                } else if (matchedPrayer === "subuh") {
                    audioSrc = "azan.mp3";
                } else {
                    audioSrc = "adzhan.mp3";
                }
                let audio = new Audio(audioSrc);
                audio.play().catch(error => console.error("Gagal memutar audio:", error));
                // Marquee akan terus bergerak sampai audio selesai,
                // kemudian baru kita hapus teks marquee
                audio.onended = function() {
                    $("#prayerAlert").html("").data("alert-active", false);
                };
                lastAdzanMinute = now.getMinutes();
                lastAdzanPrayer = matchedPrayer;
            }
            if (!$("#prayerAlert").data("alert-active")) {
                $("#prayerAlert").data("alert-active", true);
                const displayName = matchedPrayer.charAt(0).toUpperCase() + matchedPrayer.slice(1);
                // Teks marquee akan terus bergerak (dengan animasi CSS pada kelas "marquee-animation")
                $("#prayerAlert").html(`<div class="marquee-animation">Waktu ${displayName} telah tiba</div>`);
            }
        } else {
            $("#prayerAlert").html("");
        }
    }
    
    // Deteksi lokasi pengguna secara otomatis
    function detectLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async function (position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
                    const locationData = await response.json();
                    const cityName = locationData.address.city || locationData.address.town || locationData.address.village;
                    const matchedCity = cityData.find(city => city.lokasi.toLowerCase().includes(cityName.toLowerCase()));
                    if (matchedCity) {
                        selectedCityId = matchedCity.id;
                        selectedCityName = matchedCity.lokasi;
                        $('#citySelect').val(selectedCityId).trigger('change');
                        fetchSchedule(selectedCityId, selectedMonth, selectedCityName);
                    }
                } catch (error) {
                    console.error("Gagal mendapatkan lokasi:", error);
                }
            }, function (error) {
                console.warn("Lokasi tidak bisa didapatkan:", error.message);
            });
        }
    }
    setInterval(detectLocation, 60000);
});
