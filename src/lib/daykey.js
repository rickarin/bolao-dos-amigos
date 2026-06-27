export function dayKey(dateStr) {
        const d = new Date(dateStr)
        // Jogos de madrugada (antes das 6h) contam como o dia anterior
        if (d.getHours() < 6) {
                d.setDate(d.getDate() - 1)
        }
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
}
