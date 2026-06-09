// Country dialing codes for the phone sign-up selector.
export interface Country {
  iso: string;
  name: string;
  dial: string;
  flag: string;
}

export const countries: Country[] = [
  { iso: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { iso: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { iso: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { iso: "TH", name: "Thailand", dial: "+66", flag: "🇹🇭" },
  { iso: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { iso: "VN", name: "Vietnam", dial: "+84", flag: "🇻🇳" },
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { iso: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { iso: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰" },
  { iso: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { iso: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷" },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
];

export const defaultCountry = countries[0];
