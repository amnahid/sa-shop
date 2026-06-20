export function formatSAR(amount: number): string {
  return `SAR ${amount.toFixed(2)}`;
}

export function formatDate(date: Date, locale: "en" | "ar" = "en"): string {
  return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const onesEn = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tensEn = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const onesAr = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const tensAr = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];

function convertBelow1000En(n: number): string {
  if (n === 0) return "";
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  if (hundreds > 0) {
    parts.push(onesEn[hundreds] + " Hundred");
  }
  const rest = n % 100;
  if (rest > 0) {
    if (rest < 20) {
      parts.push(onesEn[rest]);
    } else {
      const ten = Math.floor(rest / 10);
      const one = rest % 10;
      parts.push(tensEn[ten] + (one > 0 ? "-" + onesEn[one] : ""));
    }
  }
  return parts.join(" ");
}

function convertBelow1000Ar(n: number): string {
  if (n === 0) return "";
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  if (hundreds > 0) {
    parts.push(hundreds === 1 ? "مائة" : onesAr[hundreds] + " مائة");
  }
  const rest = n % 100;
  if (rest > 0) {
    if (rest < 20) {
      parts.push(onesAr[rest]);
    } else {
      const ten = Math.floor(rest / 10);
      const one = rest % 10;
      if (one > 0) {
        parts.push(onesAr[one] + " و" + tensAr[ten]);
      } else {
        parts.push(tensAr[ten]);
      }
    }
  }
  return parts.join(" و ");
}

export function numberToWords(amount: number, lang: "en" | "ar" = "en"): string {
  if (amount === 0) return lang === "ar" ? "صفر" : "Zero";

  const wholePart = Math.floor(amount);
  const decimalPart = Math.round((amount - wholePart) * 100);

  const convertBelow1000 = lang === "ar" ? convertBelow1000Ar : convertBelow1000En;
  const scaleEn = ["", "Thousand", "Million", "Billion"];
  const scaleAr = ["", "ألف", "مليون", "مليار"];

  const scale = lang === "ar" ? scaleAr : scaleEn;

  let wholeWords = "";
  if (wholePart > 0) {
    const groups: number[] = [];
    let n = wholePart;
    while (n > 0) {
      groups.push(n % 1000);
      n = Math.floor(n / 1000);
    }
    const groupWords: string[] = [];
    for (let i = 0; i < groups.length; i++) {
      if (groups[i] > 0) {
        const prefix = convertBelow1000(groups[i]);
        groupWords.push(prefix + (scale[i] ? " " + scale[i] : ""));
      }
    }
    wholeWords = groupWords.reverse().join(lang === "ar" ? " و " : " ");
  }

  if (lang === "ar") {
    const halala = lang === "ar" ? "هللة" : "Halala";
    if (decimalPart > 0) {
      return `${wholeWords} ريال و ${convertBelow1000Ar(decimalPart)} ${halala}`;
    }
    return `${wholeWords} ريال فقط لا غير`;
  }

  if (decimalPart > 0) {
    return `${wholeWords} Riyals and ${convertBelow1000En(decimalPart)} Halalas`;
  }
  return `${wholeWords} Riyals Only`;
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: "Cash",
    mada: "Mada",
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    stc_pay: "STC Pay",
    apple_pay: "Apple Pay",
    tabby: "Tabby",
    tamara: "Tamara",
    bank_transfer: "Bank Transfer",
    store_credit: "Store Credit",
  };
  return labels[method] || method;
}

export function getPaymentMethodLabelAr(method: string): string {
  const labels: Record<string, string> = {
    cash: "نقداً",
    mada: "مدى",
    visa: "فيزا",
    mastercard: "ماستركارد",
    amex: "أمريكان إكسبريس",
    stc_pay: "إس تي سي باي",
    apple_pay: "أبل باي",
    tabby: "تابي",
    tamara: "تمارا",
    bank_transfer: "تحويل بنكي",
    store_credit: "رصيد متجر",
  };
  return labels[method] || method;
}
