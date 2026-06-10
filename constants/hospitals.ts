import type { Hospital } from "@/types";

// The 30 hospitals used across AidPulse (map markers, bed availability, and the
// Emergency Officer sign-in picker). Real Singapore hospitals with approximate
// coordinates; bed numbers are illustrative. Occupancy is derived from the
// department breakdown so it always agrees with the per-ward figures.
type Dept = [name: string, total: number, occupied: number];

function makeHospital(
  id: string,
  name: string,
  type: string,
  address: string,
  phone: string,
  lat: number,
  lng: number,
  depts: Dept[],
): Hospital {
  const departments = depts.map(([name, total, occupied]) => ({ name, total, occupied }));
  const totalBeds = departments.reduce((s, d) => s + d.total, 0);
  const occupied = departments.reduce((s, d) => s + d.occupied, 0);
  const available = totalBeds - occupied;
  const occupancy = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0;
  return { id, name, type, address, phone, lat, lng, totalBeds, occupied, available, occupancy, departments };
}

export const hospitals: Hospital[] = [
  // --- Public / restructured acute hospitals -------------------------------
  makeHospital("sgh", "Singapore General Hospital", "Public Acute Hospital", "Outram Rd, Singapore 169608", "+65 6222 3322", 1.2795, 103.8351, [
    ["Emergency Department", 50, 46], ["ICU", 40, 36], ["General Ward", 220, 196], ["Maternity Ward", 40, 33], ["Pediatric Ward", 40, 30],
  ]),
  makeHospital("ttsh", "Tan Tock Seng Hospital", "Public Acute Hospital", "11 Jln Tan Tock Seng, Singapore 308433", "+65 6256 6011", 1.3216, 103.8456, [
    ["Emergency Department", 48, 42], ["ICU", 36, 32], ["General Ward", 210, 178], ["Isolation Ward", 30, 26],
  ]),
  makeHospital("nuh", "National University Hospital", "Public Acute Hospital", "5 Lower Kent Ridge Rd, Singapore 119074", "+65 6779 5555", 1.2945, 103.7833, [
    ["Emergency Department", 46, 38], ["ICU", 38, 32], ["General Ward", 230, 190], ["Maternity Ward", 42, 34], ["Pediatric Ward", 44, 36],
  ]),
  makeHospital("cgh", "Changi General Hospital", "Public Acute Hospital", "2 Simei St 3, Singapore 529889", "+65 6788 8833", 1.3404, 103.9496, [
    ["Emergency Department", 50, 44], ["ICU", 34, 30], ["General Ward", 210, 176], ["Geriatric Ward", 40, 33],
  ]),
  makeHospital("ktph", "Khoo Teck Puat Hospital", "Public Acute Hospital", "90 Yishun Central, Singapore 768828", "+65 6555 8000", 1.4244, 103.8389, [
    ["Emergency Department", 44, 32], ["ICU", 30, 21], ["General Ward", 200, 144], ["Maternity Ward", 36, 25],
  ]),
  makeHospital("ntfgh", "Ng Teng Fong General Hospital", "Public Acute Hospital", "1 Jurong East St 21, Singapore 609606", "+65 6716 2000", 1.3339, 103.7457, [
    ["Emergency Department", 46, 30], ["ICU", 32, 22], ["General Ward", 210, 142], ["Pediatric Ward", 40, 26],
  ]),
  makeHospital("skgh", "Sengkang General Hospital", "Public Acute Hospital", "110 Sengkang E Way, Singapore 544886", "+65 6930 6000", 1.3955, 103.8932, [
    ["Emergency Department", 44, 34], ["ICU", 30, 23], ["General Ward", 200, 150], ["Maternity Ward", 34, 25],
  ]),
  makeHospital("wh", "Woodlands Health", "Public Acute Hospital", "17 Woodlands Dr 17, Singapore 737628", "+65 6363 1000", 1.4490, 103.7906, [
    ["Emergency Department", 42, 24], ["ICU", 28, 17], ["General Ward", 260, 156], ["Rehabilitation Ward", 60, 36],
  ]),
  makeHospital("kkh", "KK Women's and Children's Hospital", "Women & Children's Hospital", "100 Bukit Timah Rd, Singapore 229899", "+65 6225 5554", 1.3107, 103.8470, [
    ["Emergency Department", 40, 28], ["NICU", 40, 30], ["Maternity Ward", 80, 58], ["Pediatric Ward", 120, 82],
  ]),

  // --- Private hospitals ----------------------------------------------------
  makeHospital("mtelizabeth", "Mount Elizabeth Hospital", "Private Hospital", "3 Mount Elizabeth, Singapore 228510", "+65 6737 2666", 1.3050, 103.8350, [
    ["ICU", 30, 26], ["General Ward", 160, 132], ["Day Surgery", 30, 24], ["Maternity Ward", 30, 24],
  ]),
  makeHospital("mtenovena", "Mount Elizabeth Novena Hospital", "Private Hospital", "38 Irrawaddy Rd, Singapore 329563", "+65 6933 0000", 1.3203, 103.8439, [
    ["ICU", 28, 22], ["General Ward", 180, 146], ["Day Surgery", 40, 32],
  ]),
  makeHospital("gleneagles", "Gleneagles Hospital", "Private Hospital", "6A Napier Rd, Singapore 258500", "+65 6473 7222", 1.3074, 103.8186, [
    ["ICU", 24, 18], ["General Ward", 150, 112], ["Maternity Ward", 26, 18],
  ]),
  makeHospital("raffles", "Raffles Hospital", "Private Hospital", "585 North Bridge Rd, Singapore 188770", "+65 6311 1111", 1.3015, 103.8576, [
    ["Emergency Department", 24, 20], ["ICU", 20, 17], ["General Ward", 140, 116], ["Maternity Ward", 16, 12],
  ]),
  makeHospital("mtalvernia", "Mount Alvernia Hospital", "Private Hospital", "820 Thomson Rd, Singapore 574623", "+65 6347 6688", 1.3415, 103.8378, [
    ["General Ward", 160, 108], ["Maternity Ward", 40, 28], ["Day Surgery", 30, 20],
  ]),
  makeHospital("parkwayeast", "Parkway East Hospital", "Private Hospital", "321 Joo Chiat Pl, Singapore 427990", "+65 6344 7588", 1.3155, 103.9123, [
    ["ICU", 16, 10], ["General Ward", 90, 58], ["Day Surgery", 20, 13],
  ]),
  makeHospital("farrerpark", "Farrer Park Hospital", "Private Hospital", "1 Farrer Park Station Rd, Singapore 217562", "+65 6363 1818", 1.3122, 103.8540, [
    ["ICU", 20, 11], ["General Ward", 120, 70], ["Day Surgery", 30, 17],
  ]),
  makeHospital("thomson", "Thomson Medical Centre", "Private Hospital", "339 Thomson Rd, Singapore 307677", "+65 6250 2222", 1.3251, 103.8430, [
    ["Maternity Ward", 80, 54], ["General Ward", 60, 38], ["NICU", 20, 12],
  ]),

  // --- National specialty centres ------------------------------------------
  makeHospital("nhcs", "National Heart Centre Singapore", "Cardiac Specialty Centre", "5 Hospital Dr, Singapore 169609", "+65 6704 2000", 1.2792, 103.8358, [
    ["Cardiac ICU", 24, 12], ["Cardiac Ward", 60, 26], ["Day Procedure", 20, 8],
  ]),
  makeHospital("nccs", "National Cancer Centre Singapore", "Cancer Specialty Centre", "30 Hospital Blvd, Singapore 168583", "+65 6436 8000", 1.2787, 103.8353, [
    ["Oncology Ward", 60, 26], ["Day Therapy", 40, 14], ["ICU", 16, 6],
  ]),
  makeHospital("snec", "Singapore National Eye Centre", "Eye Specialty Centre", "11 Third Hospital Ave, Singapore 168751", "+65 6227 7255", 1.2787, 103.8363, [
    ["Day Surgery", 40, 12], ["Eye Ward", 20, 6],
  ]),
  makeHospital("ndcs", "National Dental Centre Singapore", "Dental Specialty Centre", "5 Second Hospital Ave, Singapore 168938", "+65 6324 8910", 1.2796, 103.8348, [
    ["Day Surgery", 30, 8], ["Recovery", 10, 2],
  ]),
  makeHospital("nsc", "National Skin Centre", "Skin Specialty Centre", "1 Mandalay Rd, Singapore 308205", "+65 6253 4455", 1.3225, 103.8442, [
    ["Day Treatment", 30, 7], ["Observation", 10, 2],
  ]),
  makeHospital("nni", "National Neuroscience Institute", "Neuroscience Specialty Centre", "11 Jln Tan Tock Seng, Singapore 308433", "+65 6357 7153", 1.3216, 103.8470, [
    ["Neuro ICU", 20, 12], ["Neuro Ward", 60, 32], ["Rehabilitation", 20, 9],
  ]),
  makeHospital("imh", "Institute of Mental Health", "Psychiatric Hospital", "10 Buangkok View, Singapore 539747", "+65 6389 2000", 1.3766, 103.8861, [
    ["Acute Psychiatric", 120, 78], ["Long-stay Ward", 200, 120], ["Rehabilitation", 80, 50],
  ]),

  // --- Community hospitals --------------------------------------------------
  makeHospital("brightvision", "Bright Vision Hospital", "Community Hospital", "5 Lor Napiri, Singapore 547530", "+65 6248 5755", 1.3760, 103.8866, [
    ["Rehabilitation", 80, 38], ["Palliative Care", 40, 18], ["Sub-acute Ward", 40, 18],
  ]),
  makeHospital("standrews", "St. Andrew's Community Hospital", "Community Hospital", "8 Simei St 3, Singapore 529895", "+65 6586 1000", 1.3400, 103.9490, [
    ["Rehabilitation", 120, 60], ["Sub-acute Ward", 60, 28], ["Palliative Care", 40, 18],
  ]),
  makeHospital("renci", "Ren Ci Community Hospital", "Community Hospital", "71 Irrawaddy Rd, Singapore 329562", "+65 6385 0288", 1.3210, 103.8460, [
    ["Rehabilitation", 100, 46], ["Sub-acute Ward", 60, 26], ["Dementia Care", 40, 16],
  ]),
  makeHospital("yishunch", "Yishun Community Hospital", "Community Hospital", "2 Yishun Central 2, Singapore 768024", "+65 6807 8800", 1.4239, 103.8372, [
    ["Rehabilitation", 140, 82], ["Sub-acute Ward", 80, 44], ["Palliative Care", 30, 15],
  ]),
  makeHospital("outramch", "Outram Community Hospital", "Community Hospital", "10 Hospital Blvd, Singapore 168582", "+65 6324 8888", 1.2790, 103.8360, [
    ["Rehabilitation", 110, 58], ["Sub-acute Ward", 70, 34], ["Palliative Care", 20, 8],
  ]),
  makeHospital("jurongch", "Jurong Community Hospital", "Community Hospital", "1 Jurong East St 21, Singapore 609606", "+65 6716 2000", 1.3339, 103.7445, [
    ["Rehabilitation", 150, 84], ["Sub-acute Ward", 80, 42], ["Palliative Care", 30, 14],
  ]),
];
