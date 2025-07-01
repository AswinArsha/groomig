import { format, parse } from "date-fns";

import { supabase } from "../../supabase";

export const handleGroomerPrintSlip = async (booking, selectedServices, serviceInputs, groomers = []) => {
  const printWindow = window.open("", "_blank", "width=300,height=600");
  
  // Get groomer name from the groomers array
  let groomerName = "Not Assigned";
  if (booking.groomer_id && Array.isArray(groomers) && groomers.length > 0) {
    const groomer = groomers.find(g => g.id === booking.groomer_id);
    if (groomer) {
      groomerName = groomer.name;
    } else {
      groomerName = "Unknown Groomer";
    }
  }
  
  // Get organization ID from localStorage
  const userSession = JSON.parse(localStorage.getItem("userSession"));
  const organizationId = userSession?.organization_id;
  
  // Default shop name and image
  let shopName = "White Dog";
  let shopImageUrl = "";
  
  // Fetch shop preferences if organization ID is available
  if (organizationId) {
    try {
      const { data, error } = await supabase
        .from("shop_preferences")
        .select("shop_name, image_url")
        .eq("organization_id", organizationId)
        .single();
      
      if (!error && data) {
        shopName = data.shop_name || shopName;
        shopImageUrl = data.image_url || "";
      }
    } catch (error) {
      console.error("Error fetching shop preferences:", error);
    }
  }
  
  // Format current date
  const currentDate = new Date();
  let formattedDate;
  try {
    // Use date-fns if available
    formattedDate = format(currentDate, "PPP, h:mm a");
  } catch (e) {
    // Fallback date formatting
    formattedDate = currentDate.toLocaleString();
  }
  
  // Format booking date
  let bookingDate = "N/A";
  try {
    if (booking.booking_date) {
      bookingDate = new Date(booking.booking_date).toLocaleDateString();
    }
  } catch (e) {
    console.error("Error formatting booking date:", e);
  }
  
  // Format time slot
  let timeSlot = "N/A";
  try {
    if (booking.sub_time_slots?.time_slots?.start_time) {
      const timeStr = booking.sub_time_slots.time_slots.start_time;
      // Simple time formatting as fallback
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      timeSlot = `${hour12}:${minutes} ${ampm}`;
    }
  } catch (e) {
    console.error("Error formatting time slot:", e);
  }
  
  if (printWindow) {
    const slipContent = `
      <html>
        <head>
          <title>Groomer Work Order</title>
          <style>
            @media print {
              @page { 
                margin: 0; 
                size: 80mm auto !important; /* Width for thermal receipt printer */
              }
              body {
                width: 72mm !important; /* Slightly less than paper width */
              }
            }
            
            body { 
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 4mm;
              width: 72mm;
              font-size: 10pt;
              line-height: 1.4;
              color: #000;
              font-weight: bold;
            }
            .header { 
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 2mm;
              margin-bottom: 3mm;
            }
            .shop-name {
              font-size: 12pt;
              font-weight: bold;
              margin-bottom: 1mm;
            }
            .title {
              font-size: 11pt;
              font-weight: bold;
              margin: 1mm 0;
            }
            .info-section {
              margin: 3mm 0;
              padding: 2mm 1mm;
            }
            .info-table {
              width: 100%;
            }
            .info-table td {
              padding: 2px 4px;
            }
            .info-table td {
              padding: 2px 4px;
              font-weight: bold;
              color: #000;
            }
            .info-table td:first-child {
              font-weight: 900;
            }
            .section-header {
              font-weight: bold;
              text-align: center;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 1mm 0;
              margin: 2mm 0;
            }
            .service-item {
              margin: 2mm 0;
              padding-bottom: 2mm;
              border-bottom: 1px dotted #999;
            }
            .service-name {
              font-weight: bold;
            }
            .service-details {
              margin-left: 2mm;
              font-size: 9pt;
            }
            .care-tip {
              margin-left: 2mm;
              margin-top: 1mm;
              font-size: 9pt;
              border-left: 2px solid #999;
              padding-left: 1mm;
            }
            .footer {
              text-align: center;
              margin-top: 5mm;
              font-size: 9pt;
              border-top: 1px dashed #000;
              padding-top: 2mm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${shopImageUrl ? `<div style="text-align:center; "><img src="${shopImageUrl}" alt="${shopName}" style="width: 20mm; height: 15mm;  filter: grayscale(100%);" /></div>` : ''}
            <div class="shop-name">${shopName}</div>
            <div>GROOMER WORK ORDER</div>
            <div>${formattedDate}</div>
          </div>
          
          <div class="info-section">
            <table class="info-table">
              <tr>
                <td>Pet:</td>
                <td>${booking.dog_name || "N/A"}</td>
              </tr>
              <tr>
                <td>Breed:</td>
                <td>${booking.dog_breed || "N/A"}</td>
              </tr>
              <tr>
                <td>Owner:</td>
                <td>${booking.customer_name || "N/A"}</td>
              </tr>
              <tr>
                <td>Contact:</td>
                <td>${booking.contact_number || "N/A"}</td>
              </tr>
              <tr>
                <td>Date:</td>
                <td>${bookingDate}</td>
              </tr>
              <tr>
                <td>Time:</td>
                <td>${timeSlot}</td>
              </tr>
              <tr>
                <td>Slot:</td>
                <td>${booking.sub_time_slots?.description || 
                      (booking.sub_time_slots?.slot_number ? `Slot ${booking.sub_time_slots.slot_number}` : "N/A")}</td>
              </tr>
              <tr>
                <td>Assigned To:</td>
                <td>${groomerName}</td>
              </tr>
            </table>
          </div>
          
          <div class="section-header">SERVICES</div>
          
          ${selectedServices
            .map((service, index) => {
              // Determine if there's a care tip for this service
              const careTip = service.care_tip || 
                              (booking.booking_services_selected && 
                               booking.booking_services_selected.find(bs => bs.service_id === service.id)?.care_tip);
                               
              return `
                <div class="service-item">
                  <div class="service-name">${index + 1}. ${service.name}</div>
                  ${service.type === "input" && serviceInputs[service.id] 
                    ? `<div class="service-details">${serviceInputs[service.id]}</div>` 
                    : ""}
                  ${careTip 
                    ? `<div class="care-tip">${careTip}</div>` 
                    : ""}
                </div>
              `;
            })
            .join("")}
          
          <div class="footer">
            <div>*** End of Work Order ***</div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(slipContent);
    printWindow.document.close();
    
    // Add longer delay before printing to ensure styles are loaded
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
        
        // Close window after printing (or after a timeout)
        printWindow.onafterprint = function() {
          printWindow.close();
        };
        
        // Fallback close in case onafterprint doesn't trigger
        setTimeout(() => {
          printWindow.close();
        }, 2000);
      } catch (e) {
        console.error("Error during printing:", e);
        alert("An error occurred while printing. Please try again.");
      }
    }, 1000); // Longer timeout for reliable printing
  }
};