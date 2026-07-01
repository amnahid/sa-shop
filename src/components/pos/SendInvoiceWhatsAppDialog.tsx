"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useToast } from "@/components/ui/toast";
import { sendInvoiceViaWhatsAppToPhone } from "@/lib/actions/invoice-whatsapp";
import { MessageCircle, Loader2 } from "lucide-react";

interface Props {
  invoiceId: string;
  defaultPhone: string | null;
}

export function SendInvoiceWhatsAppDialog({ invoiceId, defaultPhone }: Props) {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState(defaultPhone || "");
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      showToast("Phone number is required", "error");
      return;
    }

    setSending(true);
    const result = await sendInvoiceViaWhatsAppToPhone(invoiceId, phone);
    setSending(false);

    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast("Invoice sent via WhatsApp successfully", "success");
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex-1 font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
        >
          <MessageCircle className="w-4 h-4 me-2 shrink-0" />
          {locale === "ar" ? "إرسال عبر الواتساب" : "Send via WhatsApp"}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md" dir={locale === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-gray-900 tracking-tight text-start">
            {locale === "ar" ? "إرسال الفاتورة عبر الواتساب" : "Send Invoice via WhatsApp"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4 pt-2">
          <div>
            <label htmlFor="wa-phone-input" className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-500 text-start">
              {locale === "ar" ? "رقم هاتف المستلم" : "Recipient Phone Number"}
            </label>
            <Input
              id="wa-phone-input"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +966500000000"
              className={locale === "ar" ? "text-right font-medium" : "font-medium"}
              required
            />
            <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-tight text-start leading-normal">
              {locale === "ar" 
                ? "يجب إدخال الرقم بالصيغة الدولية الكاملة (مثال: 9665XXXXXXXX+)."
                : "Phone number must include country code in E.164 format (e.g., +9665XXXXXXXX)."}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={sending}>
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" disabled={sending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                  {locale === "ar" ? "جاري الإرسال..." : "Sending..."}
                </>
              ) : (
                locale === "ar" ? "إرسال الفاتورة" : "Send Invoice"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
