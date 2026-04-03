function abrirModalFiltrosExcel() {
    // 1. Buscamos el elemento en el DOM
    const modalElement = document.getElementById('modalFiltrosExcel');
    
    if (!modalElement) {
        console.error(" Error: No se encontró el modal con ID 'modalFiltrosExcel' en el HTML.");
        Swal.fire('Error', 'No se encontró el formulario de filtros', 'error');
        return;
    }

    // 2. Creamos la instancia de Bootstrap
    const modalFiltros = new bootstrap.Modal(modalElement);
    
    // 3. Lo mostramos
    modalFiltros.show();
}


async function ejecutarDescargaExcel() {
    // 1. EXTRAER EL ID DEL BOTÓN DE HISTORIAL
    const btnHistorial = document.querySelector('[onclick^="abrirHistorial"]');
    let colegioId = null;

    if (btnHistorial) {
        const match = btnHistorial.getAttribute('onclick').match(/'(\d+)'/);
        if (match) {
            colegioId = match[1];
        }
    }

    console.log(" ID extraído:", colegioId);

    // 2. VALIDACIONES Y CAPTURA DE INPUTS
    if (!colegioId) {
        Swal.fire('Error', 'No se pudo rescatar el ID del colegio.', 'error');
        return;
    }

    const fInicio = document.getElementById('fechaInicioExcel').value;
    const fFin = document.getElementById('fechaFinExcel').value;
    const tContrato = document.getElementById('tipoContratoExcel').value;
    const rubroSel = document.getElementById('rubroExcel').value; // <--- CAPTURAMOS EL RUBRO

    if (!fInicio || !fFin) {
        Swal.fire('Atención', 'Selecciona el rango de fechas.', 'warning');
        return;
    }

    // 3. PROCESO DE DESCARGA
    Swal.fire({
        title: 'Generando reporte...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // Agregamos 'rubro' a los parámetros que viajan al backend
        const params = new URLSearchParams({
            colegio_id: colegioId,
            inicio: fInicio,
            fin: fFin,
            tipo: tContrato,
            rubro: rubroSel 
        }).toString();

        const urlDescarga = `/reportes_excel/exportar-excel-procesos?${params}`;
        
        // Hacemos un fetch previo solo para verificar si hay datos
        const response = await fetch(urlDescarga);

        if (response.ok) {
            const contentType = response.headers.get('Content-Type');
            
            // Si el servidor responde con el Excel (o algo que no sea JSON de error)
            if (contentType && contentType.includes('spreadsheet')) {
                window.location.href = urlDescarga; // Dispara la descarga real
                Swal.fire({
                    icon: 'success',
                    title: '¡Reporte listo!',
                    timer: 2000,
                    showConfirmButton: false
                });
                
                // Cerrar el modal de filtros
                bootstrap.Modal.getInstance(document.getElementById('modalFiltrosExcel'))?.hide();
            } else {
                // Si respondió OK pero es un JSON (posible mensaje de "No hay datos")
                const data = await response.json();
                Swal.fire('Aviso', data.message || 'No se encontraron procesos.', 'info');
            }
        } else {
            const data = await response.json().catch(() => ({}));
            Swal.fire('Error', data.message || 'Error al generar el archivo.', 'error');
        }
    } catch (error) {
        console.error("Error en descarga:", error);
        Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
    }
}