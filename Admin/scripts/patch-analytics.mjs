import fs from 'fs';

const file = 'd:/Ab/StarchData/GameZ/Admin/src/pages/Analytics.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/b\.amount_paid \|\| b\.price \|\| b\.total_amount/g, 'b.total_price');
content = content.replace(/b\.amount_paid \|\| b\.price/g, 'b.total_price');
content = content.replace(/b\.station_id/g, 'b.assigned_station_id');
content = content.replace(/b\.guest_email/g, 'b.email');

fs.writeFileSync(file, content);
console.log("Analytics.tsx patched.");
