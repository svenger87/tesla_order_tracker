import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getAdminFromCookie } from '@/lib/auth'
import ExcelJS from 'exceljs'

export async function GET() {
  try {
    const admin = await getAdminFromCookie()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    // Fetch all orders
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Create workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Tesla Order Tracker'
    workbook.created = new Date()

    // ===== Sheet 1: All Orders =====
    const ordersSheet = workbook.addWorksheet('Bestellungen', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    })

    // Define columns
    ordersSheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Bestelldatum', key: 'orderDate', width: 15 },
      { header: 'Land', key: 'country', width: 15 },
      { header: 'Modell', key: 'model', width: 15 },
      { header: 'Reichweite', key: 'range', width: 20 },
      { header: 'Antrieb', key: 'drive', width: 15 },
      { header: 'Farbe', key: 'color', width: 20 },
      { header: 'Innenraum', key: 'interior', width: 15 },
      { header: 'Felgen', key: 'wheels', width: 10 },
      { header: 'AHK', key: 'towHitch', width: 10 },
      { header: 'Autopilot', key: 'autopilot', width: 15 },
      { header: 'Lieferfenster', key: 'deliveryWindow', width: 20 },
      { header: 'Lieferort', key: 'deliveryLocation', width: 25 },
      { header: 'VIN', key: 'vin', width: 20 },
      { header: 'VIN Datum', key: 'vinReceivedDate', width: 15 },
      { header: 'Papiere Datum', key: 'papersReceivedDate', width: 15 },
      { header: 'Produktionsdatum', key: 'productionDate', width: 15 },
      { header: 'Typgenehmigung', key: 'typeApproval', width: 15 },
      { header: 'Typvariante', key: 'typeVariant', width: 15 },
      { header: 'Lieferdatum', key: 'deliveryDate', width: 15 },
      { header: 'Tage: Bestellung→Produktion', key: 'orderToProduction', width: 20 },
      { header: 'Tage: Bestellung→VIN', key: 'orderToVin', width: 20 },
      { header: 'Tage: Bestellung→Lieferung', key: 'orderToDelivery', width: 20 },
      { header: 'Tage: Bestellung→Papiere', key: 'orderToPapers', width: 20 },
      { header: 'Tage: Papiere→Lieferung', key: 'papersToDelivery', width: 20 },
      { header: 'Archiviert', key: 'archived', width: 10 },
      { header: 'Erstellt', key: 'createdAt', width: 20 },
      { header: 'Aktualisiert', key: 'updatedAt', width: 20 },
    ]

    // Style header row
    ordersSheet.getRow(1).font = { bold: true }
    ordersSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    ordersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    // Add data
    orders.forEach(order => {
      ordersSheet.addRow({
        ...order,
        archived: order.archived ? 'Ja' : 'Nein',
        createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString('de-DE') : '',
        updatedAt: order.updatedAt ? new Date(order.updatedAt).toLocaleString('de-DE') : '',
      })
    })

    // ===== Sheet 2: Statistics Summary =====
    const statsSheet = workbook.addWorksheet('Statistiken')

    const totalOrders = orders.length
    const deliveredOrders = orders.filter(o => o.deliveryDate).length
    const pendingOrders = totalOrders - deliveredOrders

    // Calculate averages
    const deliveredWithDays = orders.filter(o => o.orderToDelivery !== null)
    const avgDeliveryDays = deliveredWithDays.length > 0
      ? Math.round(deliveredWithDays.reduce((sum, o) => sum + (o.orderToDelivery || 0), 0) / deliveredWithDays.length)
      : null

    const withVinDays = orders.filter(o => o.orderToVin !== null)
    const avgVinDays = withVinDays.length > 0
      ? Math.round(withVinDays.reduce((sum, o) => sum + (o.orderToVin || 0), 0) / withVinDays.length)
      : null

    statsSheet.columns = [
      { header: 'Kennzahl', key: 'metric', width: 30 },
      { header: 'Wert', key: 'value', width: 20 },
    ]

    statsSheet.getRow(1).font = { bold: true }
    statsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    statsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    const statsData = [
      { metric: 'Gesamtbestellungen', value: totalOrders },
      { metric: 'Geliefert', value: deliveredOrders },
      { metric: 'Ausstehend', value: pendingOrders },
      { metric: 'Lieferquote', value: `${totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0}%` },
      { metric: 'Ø Lieferzeit (Tage)', value: avgDeliveryDays ?? '-' },
      { metric: 'Ø Zeit bis VIN (Tage)', value: avgVinDays ?? '-' },
      { metric: 'Export-Datum', value: new Date().toLocaleString('de-DE') },
    ]

    statsData.forEach(row => statsSheet.addRow(row))

    // ===== Sheet 3: Model Distribution =====
    const modelSheet = workbook.addWorksheet('Modellverteilung')
    const modelCounts: Record<string, number> = {}
    orders.forEach(o => {
      const model = o.model || 'Unbekannt'
      modelCounts[model] = (modelCounts[model] || 0) + 1
    })

    modelSheet.columns = [
      { header: 'Modell', key: 'model', width: 20 },
      { header: 'Anzahl', key: 'count', width: 15 },
      { header: 'Anteil', key: 'percentage', width: 15 },
    ]

    modelSheet.getRow(1).font = { bold: true }
    modelSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    modelSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    Object.entries(modelCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([model, count]) => {
        modelSheet.addRow({
          model,
          count,
          percentage: `${((count / totalOrders) * 100).toFixed(1)}%`,
        })
      })

    // ===== Sheet 4: Range Distribution =====
    const rangeSheet = workbook.addWorksheet('Reichweitenverteilung')
    const rangeCounts: Record<string, number> = {}
    orders.forEach(o => {
      const range = o.range || 'Unbekannt'
      rangeCounts[range] = (rangeCounts[range] || 0) + 1
    })

    rangeSheet.columns = [
      { header: 'Reichweite', key: 'range', width: 25 },
      { header: 'Anzahl', key: 'count', width: 15 },
      { header: 'Anteil', key: 'percentage', width: 15 },
    ]

    rangeSheet.getRow(1).font = { bold: true }
    rangeSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    rangeSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    Object.entries(rangeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([range, count]) => {
        rangeSheet.addRow({
          range,
          count,
          percentage: `${((count / totalOrders) * 100).toFixed(1)}%`,
        })
      })

    // ===== Sheet 5: Country Distribution =====
    const countrySheet = workbook.addWorksheet('Länderverteilung')
    const countryCounts: Record<string, number> = {}
    orders.forEach(o => {
      const country = o.country || 'Unbekannt'
      countryCounts[country] = (countryCounts[country] || 0) + 1
    })

    countrySheet.columns = [
      { header: 'Land', key: 'country', width: 25 },
      { header: 'Anzahl', key: 'count', width: 15 },
      { header: 'Anteil', key: 'percentage', width: 15 },
    ]

    countrySheet.getRow(1).font = { bold: true }
    countrySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    countrySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([country, count]) => {
        countrySheet.addRow({
          country,
          count,
          percentage: `${((count / totalOrders) * 100).toFixed(1)}%`,
        })
      })

    // ===== Sheet 6: Color Distribution =====
    const colorSheet = workbook.addWorksheet('Farbverteilung')
    const colorCounts: Record<string, number> = {}
    orders.forEach(o => {
      const color = o.color || 'Unbekannt'
      colorCounts[color] = (colorCounts[color] || 0) + 1
    })

    colorSheet.columns = [
      { header: 'Farbe', key: 'color', width: 25 },
      { header: 'Anzahl', key: 'count', width: 15 },
      { header: 'Anteil', key: 'percentage', width: 15 },
    ]

    colorSheet.getRow(1).font = { bold: true }
    colorSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    colorSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([color, count]) => {
        colorSheet.addRow({
          color,
          count,
          percentage: `${((count / totalOrders) * 100).toFixed(1)}%`,
        })
      })

    // ===== Sheet 7: Drive Distribution =====
    const driveSheet = workbook.addWorksheet('Antriebsverteilung')
    const driveCounts: Record<string, number> = {}
    orders.forEach(o => {
      const drive = o.drive || 'Unbekannt'
      driveCounts[drive] = (driveCounts[drive] || 0) + 1
    })

    driveSheet.columns = [
      { header: 'Antrieb', key: 'drive', width: 25 },
      { header: 'Anzahl', key: 'count', width: 15 },
      { header: 'Anteil', key: 'percentage', width: 15 },
    ]

    driveSheet.getRow(1).font = { bold: true }
    driveSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    driveSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    Object.entries(driveCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([drive, count]) => {
        driveSheet.addRow({
          drive,
          count,
          percentage: `${((count / totalOrders) * 100).toFixed(1)}%`,
        })
      })

    // ===== Sheet 8: Wheels Distribution =====
    const wheelsSheet = workbook.addWorksheet('Felgenverteilung')
    const wheelsCounts: Record<string, number> = {}
    orders.forEach(o => {
      const wheels = o.wheels || 'Unbekannt'
      wheelsCounts[wheels] = (wheelsCounts[wheels] || 0) + 1
    })

    wheelsSheet.columns = [
      { header: 'Felgen', key: 'wheels', width: 25 },
      { header: 'Anzahl', key: 'count', width: 15 },
      { header: 'Anteil', key: 'percentage', width: 15 },
    ]

    wheelsSheet.getRow(1).font = { bold: true }
    wheelsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    wheelsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    Object.entries(wheelsCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([wheels, count]) => {
        wheelsSheet.addRow({
          wheels,
          count,
          percentage: `${((count / totalOrders) * 100).toFixed(1)}%`,
        })
      })

    // ===== Sheet 9: Timeline (Orders per Month) =====
    const timelineSheet = workbook.addWorksheet('Bestellungen pro Monat')
    const monthCounts: Record<string, number> = {}

    orders.forEach(o => {
      if (o.orderDate) {
        // Parse German date DD.MM.YYYY
        const parts = o.orderDate.split('.')
        if (parts.length === 3) {
          const monthKey = `${parts[1]}/${parts[2]}` // MM/YYYY
          monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1
        }
      }
    })

    timelineSheet.columns = [
      { header: 'Monat', key: 'month', width: 15 },
      { header: 'Bestellungen', key: 'count', width: 15 },
    ]

    timelineSheet.getRow(1).font = { bold: true }
    timelineSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    timelineSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    // Sort by date
    Object.entries(monthCounts)
      .sort((a, b) => {
        const [aMonth, aYear] = a[0].split('/')
        const [bMonth, bYear] = b[0].split('/')
        return (parseInt(aYear) * 100 + parseInt(aMonth)) - (parseInt(bYear) * 100 + parseInt(bMonth))
      })
      .forEach(([month, count]) => {
        timelineSheet.addRow({ month, count })
      })

    // ===== Sheet 10: Deliveries per Month =====
    const deliveryTimelineSheet = workbook.addWorksheet('Lieferungen pro Monat')
    const deliveryMonthCounts: Record<string, number> = {}

    orders.forEach(o => {
      if (o.deliveryDate) {
        const parts = o.deliveryDate.split('.')
        if (parts.length === 3) {
          const monthKey = `${parts[1]}/${parts[2]}`
          deliveryMonthCounts[monthKey] = (deliveryMonthCounts[monthKey] || 0) + 1
        }
      }
    })

    deliveryTimelineSheet.columns = [
      { header: 'Monat', key: 'month', width: 15 },
      { header: 'Lieferungen', key: 'count', width: 15 },
    ]

    deliveryTimelineSheet.getRow(1).font = { bold: true }
    deliveryTimelineSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    deliveryTimelineSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    Object.entries(deliveryMonthCounts)
      .sort((a, b) => {
        const [aMonth, aYear] = a[0].split('/')
        const [bMonth, bYear] = b[0].split('/')
        return (parseInt(aYear) * 100 + parseInt(aMonth)) - (parseInt(bYear) * 100 + parseInt(bMonth))
      })
      .forEach(([month, count]) => {
        deliveryTimelineSheet.addRow({ month, count })
      })

    // ===== Sheet 11: Admin Options =====
    const optionsSheet = workbook.addWorksheet('Dropdown-Optionen')

    const options = await prisma.option.findMany({
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }]
    })

    optionsSheet.columns = [
      { header: 'Typ', key: 'type', width: 15 },
      { header: 'Wert', key: 'value', width: 20 },
      { header: 'Anzeigename', key: 'label', width: 25 },
      { header: 'Sortierung', key: 'sortOrder', width: 12 },
      { header: 'Metadaten', key: 'metadata', width: 30 },
    ]

    optionsSheet.getRow(1).font = { bold: true }
    optionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    optionsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    options.forEach(opt => {
      optionsSheet.addRow({
        type: opt.type,
        value: opt.value,
        label: opt.label,
        sortOrder: opt.sortOrder,
        metadata: opt.metadata ? JSON.stringify(opt.metadata) : '',
      })
    })

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Return as downloadable file
    const filename = `Tesla_Order_Tracker_Export_${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error('Export failed:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
