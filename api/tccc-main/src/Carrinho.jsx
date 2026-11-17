import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "./supabaseClient";

function gerarPixPayload({ chave, nome, cidade, valor, txtId = "***" }) {
    const format = (id, value) => {
        const len = value.length.toString().padStart(2, "0");
        return `${id}${len}${value}`;
    };

    const cleanNome = (nome || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .slice(0, 25);

    const cleanCidade = (cidade || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .slice(0, 15);

    const cleanChave = (chave || "").trim();
    const valorFormatado = Number(valor || 0).toFixed(2);

    const merchantAccount =
        format("00", "br.gov.bcb.pix") +
        format("01", cleanChave);

    const additionalData = format("05", txtId);

    let payload =
        format("00", "01") +
        format("26", merchantAccount) +
        format("52", "0000") +
        format("53", "986") +
        format("54", valorFormatado) +
        format("58", "BR") +
        format("59", cleanNome) +
        format("60", cleanCidade) +
        format("62", additionalData) +
        "6304";

    return payload;
}