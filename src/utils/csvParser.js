// парсю свиху в массив обьектов
export function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(';').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        if (!line.trim()) return null;
        
        const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        
        headers.forEach((header, index) => {
            let value = values[index] || '';
            
            // преобразую числа
            if (header === 'lat' || header === 'lon' || header === 'id_station' || header === 'id_line') {
                value = parseFloat(value);
                if (isNaN(value)) value = null;
            }
            
            obj[header] = value;
        });
        
        return obj;
    }).filter(item => item !== null);
}