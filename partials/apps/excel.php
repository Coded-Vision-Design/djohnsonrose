<!-- partials/apps/excel.php: the same markup as v2's Excel.tsx, styled by assets/css/office.css. -->
<div class="office-app" data-office-app="excel" x-data="excelApp()">
    <div class="office-titlebar">
        <div class="office-titlebar-name">
            <img :src="imgPath + 'excel.webp'" alt="">
            <span>portfolio.xlsx - Excel</span>
        </div>
        <span class="office-user office-optional">DeVanté Johnson-Rose</span>
    </div>

    <div class="office-tabs">
        <template x-for="tab in TABS" :key="tab">
            <span class="office-tab" :data-active="tab === 'Home' ? '' : null" x-text="tab"></span>
        </template>
    </div>

    <div class="excel-formula">
        <div class="excel-namebox" data-excel-namebox x-text="active"></div>
        <span class="excel-fx" aria-hidden="true">fx</span>
        <input type="text" readonly aria-label="Formula bar" data-excel-formula :value="O.cellValue(sheet, active)">
    </div>

    <div class="excel-sheet">
        <table class="excel-grid" role="grid" aria-label="portfolio.xlsx">
            <thead>
                <tr>
                    <th class="excel-rowhead" scope="col"></th>
                    <template x-for="letter in sheet.columns" :key="letter">
                        <th scope="col" x-text="letter"></th>
                    </template>
                </tr>
            </thead>
            <tbody>
                <template x-for="row in sheet.rows" :key="row.number">
                    <tr>
                        <th class="excel-rowhead" scope="row" x-text="row.number"></th>
                        <template x-for="cell in row.cells" :key="cell.ref">
                            <td :data-cell="cell.ref" :data-header="cell.header && cell.value ? '' : null"
                                :aria-selected="String(cell.ref === active)" :title="cell.value || null"
                                @click="active = cell.ref" x-text="cell.value"></td>
                        </template>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>

    <div class="office-status">
        <div class="office-status-group">
            <span>Sheet1</span>
        </div>
        <div class="office-status-group" data-excel-status>
            <span x-text="state === 'error' ? 'portfolio.json could not be loaded' : state === 'ready' ? `Count: ${sheet.count}` : 'Loading…'"></span>
            <span class="office-optional">Ready</span>
        </div>
    </div>
</div>
