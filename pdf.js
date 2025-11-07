// pdf.js
// Handles all PDF generation logic.

// --- Helper: Load Image as Promise ---
export function loadLogoImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (err) => {
            console.error(`Failed to load image: ${src}`, err);
            reject(err);
        };
    });
}

// --- Helper: Download Last Response ---
export async function downloadLastResponse(lastAssistantResponse, logoImage) {
    if (!lastAssistantResponse) {
        alert("There is no response to download!");
        return;
    }

    // We pass in the logoImage, but if it failed, load it on-demand
    let currentLogo = logoImage;
    if (!currentLogo) {
        console.warn("Logo was not pre-loaded. Attempting to load now...");
        try {
            currentLogo = await loadLogoImage('cervantes.jpg'); 
            console.log("Logo loaded on-demand.");
        } catch (err) {
            console.error("Failed to load logo on-demand:", err);
        }
    }

    // --- 1. CONFIGURACIÓN (Setup) ---
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const fontSize = 10;
    doc.setFontSize(fontSize); 
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - (margin * 2);
    const maxPageHeight = pageHeight - margin; 
    const imgWidth = 15; 
    const imgHeight = 15; 
    const imgX = pageWidth - margin - imgWidth;
    const imgY = pageHeight - margin - imgHeight;

    const cleanText = lastAssistantResponse.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, '');
    const lines = doc.splitTextToSize(cleanText, usableWidth);
    let cursorY = margin;
    const lineHeight = 5; 

    // --- Add image to the FIRST page ---
    if (currentLogo) {
        doc.addImage(currentLogo, 'JPEG', imgX, imgY, imgWidth, imgHeight);
    }

    lines.forEach(line => {
       if (cursorY + lineHeight > maxPageHeight) {
            doc.addPage();
            doc.setFontSize(fontSize);
            cursorY = margin;
            if (currentLogo) {
                doc.addImage(currentLogo, 'JPEG', imgX, imgY, imgWidth, imgHeight);
            }
        }
        doc.text(line, margin, cursorY);
        cursorY += lineHeight;
    });

    doc.save("assistant_response.pdf");
}