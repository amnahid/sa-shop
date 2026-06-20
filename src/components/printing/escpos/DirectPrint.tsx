"use client";

import { useState, useCallback } from "react";
import { buildThermalReceipt } from "@/lib/printing/escpos";
import { Printer, Usb, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface DirectPrintProps {
  invoiceNumber: string;
  issuedAt: Date;
  businessName: string;
  businessNameAr?: string;
  vatNumber?: string;
  address?: string;
  phone?: string;
  lines: Array<{
    name: string;
    nameAr?: string;
    sku: string;
    price: number;
    qty: number;
    discount: number;
    total: number;
  }>;
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  paymentMethod: string;
  qrData?: string;
  width?: "80mm" | "58mm";
}

type Status = "idle" | "connecting" | "printing" | "success" | "error";

export function DirectPrint(props: DirectPrintProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  const isWebUsbSupported = typeof navigator !== "undefined" && "usb" in navigator;

  const handlePrint = useCallback(async () => {
    if (!isWebUsbSupported) {
      setStatus("error");
      setError("WebUSB is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    setStatus("connecting");
    setError("");

    try {
      const device = await navigator.usb.requestDevice({
        filters: [
          // Common thermal printer USB vendor IDs
          { vendorId: 0x0416 }, // BIXOLON
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0fe6 }, // Star Micronics
          { vendorId: 0x067b }, // Prolific (generic USB-to-serial adapters)
          { vendorId: 0x0525 }, // Netchip (common in POS printers)
        ],
      });

      await device.open();
      await device.selectConfiguration(1);

      // Find the first bulk-out endpoint
      const iface = device.configuration.interfaces[0];
      const endpoint = iface.alternate.endpoints.find(
        (ep: USBEndpoint) => ep.direction === "out" && ep.type === "bulk"
      );

      if (!endpoint) {
        await device.close();
        setStatus("error");
        setError("No suitable USB endpoint found on this device.");
        return;
      }

      await device.claimInterface(iface.interfaceNumber);
      setStatus("printing");

      const dateStr = props.issuedAt.toLocaleDateString("en-SA", {
        year: "numeric", month: "2-digit", day: "2-digit",
      });

      const data = buildThermalReceipt({
        businessName: props.businessName,
        businessNameAr: props.businessNameAr,
        vatNumber: props.vatNumber,
        address: props.address,
        phone: props.phone,
        invoiceNumber: props.invoiceNumber,
        date: dateStr,
        items: props.lines,
        subtotal: props.subtotal,
        discountTotal: props.discountTotal,
        vatTotal: props.vatTotal,
        grandTotal: props.grandTotal,
        paymentMethod: props.paymentMethod,
        qrData: props.qrData,
        isNarrow: props.width === "58mm",
      });

      const buffer = data.buffer as ArrayBuffer;
      await device.transferOut(endpoint.endpointNumber, buffer);
      await device.close();

      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("USB print error:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to print via USB");
    }
  }, [props, isWebUsbSupported]);

  return (
    <div className="direct-print">
      <button
        onClick={handlePrint}
        disabled={status === "connecting" || status === "printing"}
        className={`w-full flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
          status === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : status === "error"
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-background border border-input hover:bg-accent text-foreground"
        }`}
      >
        {status === "idle" && (
          <>
            <Usb className="w-4 h-4" />
            <span>Print via USB (ESC/POS)</span>
          </>
        )}
        {status === "connecting" && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting to printer...</span>
          </>
        )}
        {status === "printing" && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Printing...</span>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Printed successfully!</span>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="w-4 h-4" />
            <span className="flex-1 text-left">{error}</span>
          </>
        )}
      </button>

      {!isWebUsbSupported && status === "idle" && (
        <p className="mt-1 text-xs text-muted-foreground">
          USB direct printing requires Chrome or Edge browser.
        </p>
      )}
    </div>
  );
}
