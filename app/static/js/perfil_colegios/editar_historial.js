async function editarProceso(id) {
    const modalHistorialElement = document.getElementById('modalHistorial');
    let bsHistorial = bootstrap.Modal.getInstance(modalHistorialElement);
    if (bsHistorial) bsHistorial.hide();

    try {
        const response = await fetch(`/procesos/obtener_proceso/${id}`);
        if (!response.ok) throw new Error("No se pudo obtener el proceso");
        const p = await response.json();

        const modalEditorElement = document.getElementById('modalGeneradorDocs');
        const formulario = document.getElementById('formExpedienteCompleto');
        
        // --- A) LIMPIEZA INICIAL (IMPORTANTE: Antes de llenar datos) ---
        if (formulario) formulario.reset(); 
        const cuerpoTabla = document.getElementById('cuerpoTablaItems');
        if (cuerpoTabla) cuerpoTabla.innerHTML = ''; 

        // --- B) CAMBIAR APARIENCIA ---
        const titulo = document.getElementById('tituloModalExpediente');
        if (titulo) titulo.innerText = `Editando Proceso #${p.numero_proceso_colegio || p.id}`;

        // --- C) SINCRONIZACIÓN DE VIGENCIA (AÑOS) ---
        console.log("Datos recibidos del servidor (p):", p);
        const vigenciaDB = p.vigencia || 2026;
        const inputOcultoVigencia = document.getElementById('modalVigenciaInput');
        const textoBotonAnio = document.getElementById('anioTextoModal');

        if (inputOcultoVigencia) inputOcultoVigencia.value = vigenciaDB;
        if (textoBotonAnio) textoBotonAnio.innerText = vigenciaDB;

        // --- D) LLENAR FORMULARIO ---
        document.getElementById('proceso_id_hidden').value = p.id;
        document.getElementById('prov_principal').value = p.proveedor_id || "";
        document.getElementById('prov_2').value = p.proveedor2_id || "";
        document.getElementById('prov_3').value = p.proveedor3_id || "";
        
        document.querySelector('[name="valor_propuesta2"]').value = p.valor_propuesta2 || 0;
        document.querySelector('[name="valor_propuesta3"]').value = p.valor_propuesta3 || 0;
        document.getElementById('rubro_nombre').value = p.rubro_nombre || "";
        document.querySelector('[name="tipo_contrato"]').value = p.tipo_contrato || "";
        document.querySelector('[name="cdp_numero"]').value = p.cdp_numero || "";
        document.getElementById('cod_presupuestal').value = p.cod_presupuestal || "";
        document.querySelector('[name="objeto_desc"]').value = p.objeto_desc || "";
        document.getElementById('plazo_txt').value = p.plazo_txt || "";

        ['f_elaboracion', 'f_publicacion', 'f_recepcion', 'f_cierre', 'f_verificacion', 'f_firma', 'f_recibido'].forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = p[f] ? p[f] : "";
        });

        // --- E) TABLA DE ÍTEMS ---
        if (p.items && p.items.length > 0) {
            p.items.forEach(item => {
                if (typeof agregarFilaConDatos === "function") agregarFilaConDatos(item); 
            });
        } else {
            if (typeof agregarFilaItem === "function") agregarFilaItem(); 
        }

        // --- F) MOSTRAR MODAL Y DISPARAR AÑOS (REFORZADO) ---
        let modalEditorFinal = bootstrap.Modal.getInstance(modalEditorElement);
        if (!modalEditorFinal) {
            modalEditorFinal = new bootstrap.Modal(modalEditorElement);
        }

        // 1. Intento inmediato: Si el modal ya estaba en el DOM, esto lo rellena
        if (typeof cargarAniosModal === "function") {
            cargarAniosModal();
        }
        
        modalEditorFinal.show();

        // 2. Intento al abrirse: Cuando Bootstrap termina de mostrarlo
        modalEditorElement.addEventListener('shown.bs.modal', function () {
            console.log("Modal visible, refrescando años...");
            if (typeof cargarAniosModal === "function") {
                cargarAniosModal(); 
            }
        }, { once: true });

        // 3. Intento de seguridad: Por si las animaciones de los dos modales chocaron
        setTimeout(() => {
            const grid = document.getElementById('gridAniosModal');
            if (grid && grid.innerHTML === '') {
                console.log("Seguridad: El grid estaba vacío, reintentando carga...");
                cargarAniosModal();
            }
        }, 600);

        // --- G) EVENTO AL CERRAR ---
        const alCerrarModal = function () {
            const grid = document.getElementById('gridAniosModal');
            if (grid) grid.innerHTML = ''; // Limpiamos para el siguiente

            const mHistElement = document.getElementById('modalHistorial');
            if (mHistElement) {
                // Pequeño delay para evitar conflicto de backdrops de Bootstrap
                setTimeout(() => {
                    const mHist = new bootstrap.Modal(mHistElement);
                    mHist.show();
                }, 300);
            }
        };

        modalEditorElement.addEventListener('hidden.bs.modal', alCerrarModal, { once: true });

        if (typeof actualizarGranTotal === "function") actualizarGranTotal();

    } catch (error) {
        console.error("Error:", error);
        Swal.fire('Error', 'No se pudieron cargar los datos.', 'error');
    }
}
// Función auxiliar para insertar las filas con datos
function agregarFilaConDatos(item) {
    const tbody = document.getElementById('cuerpoTablaItems');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="number" name="cant[]" class="form-control form-control-sm text-center" value="${item.cantidad}" onchange="recalcularFila(this)"></td>
        <td><input type="text" name="cod_clasificador[]" class="form-control form-control-sm" value="${item.codigo_clasificador || ''}"></td>
        <td><input type="text" name="desc[]" class="form-control form-control-sm" value="${item.descripcion}"></td>
        <td><input type="number" name="v_unit[]" class="form-control form-control-sm text-end" value="${item.v_unitario}" onchange="recalcularFila(this)"></td>
        <td><input type="number" name="v_total[]" class="form-control form-control-sm text-end bg-light" readonly value="${item.v_total}"></td>
        <td class="text-center">
            <button type="button" class="btn btn-link btn-sm text-danger p-0" onclick="this.closest('tr').remove(); actualizarGranTotal();">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
}

// funcion para editar un proceso
async function editarProceso(id) {
    // --- 1. CERRAR EL HISTORIAL ANTES DE EMPEZAR ---
    const modalHistorialElement = document.getElementById('modalHistorial');
    const bsHistorial = bootstrap.Modal.getInstance(modalHistorialElement);
    if (bsHistorial) bsHistorial.hide();

    try {
        const response = await fetch(`/procesos/obtener_proceso/${id}`);
        if (!response.ok) throw new Error("No se pudo obtener el proceso");
        const p = await response.json();

        // --- 2. PREPARAR EL MODAL DE EDICIÓN ---
        // Título e Icono
        const titulo = document.getElementById('tituloModalExpediente');
        const iconoTitulo = document.getElementById('iconoModalExpediente');
        if (titulo) titulo.innerText = `Editando Proceso #${p.numero_proceso_colegio || p.id}`;
        if (iconoTitulo) iconoTitulo.className = "bi bi-pencil-square me-2 text-warning";

        // --- >>> AQUÍ EL CAMBIO VISUAL DEL BOTÓN <<< ---
        const btnAccion = document.getElementById('btnAccionExpediente');
        const textoBtn = document.getElementById('textoBtnExpediente');
        const iconoBtn = document.getElementById('iconoBtnExpediente');

        if (btnAccion) {
            btnAccion.className = "btn btn-warning px-4 text-dark fw-bold"; // Cambia a amarillo
        }
        if (textoBtn) {
            textoBtn.innerText = "Actualizar Expediente"; // Cambia el texto
        }
        if (iconoBtn) {
            iconoBtn.className = "bi bi-arrow-clockwise me-2"; // Cambia el icono a uno de "refrescar"
        }
        // ------------------------------------------------

        // Manejo del ID oculto
        let inputId = document.getElementById('proceso_id_hidden');
        if (inputId) {
            inputId.value = p.id;
        }

        // Llenado de campos básicos
        document.getElementById('prov_principal').value = p.proveedor_id;
        document.getElementById('prov_2').value = p.proveedor2_id || "";
        document.getElementById('prov_3').value = p.proveedor3_id || "";
        document.getElementsByName('valor_propuesta2')[0].value = p.valor_propuesta2 || 0;
        document.getElementsByName('valor_propuesta3')[0].value = p.valor_propuesta3 || 0;
        document.getElementById('rubro_nombre').value = p.rubro_nombre || "";
        document.getElementsByName('tipo_contrato')[0].value = p.tipo_contrato;
        document.getElementsByName('cdp_numero')[0].value = p.cdp_numero || "";
        document.getElementById('cod_presupuestal').value = p.cod_presupuestal || "";
        document.getElementsByName('objeto_desc')[0].value = p.objeto_desc || "";

        // Fechas
        const fechas = ['f_elaboracion', 'f_publicacion', 'f_recepcion', 'f_cierre', 'f_verificacion', 'f_firma', 'f_recibido'];
        fechas.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = p[f] ? p[f] : "";
        });
        document.getElementById('plazo_txt').value = p.plazo_txt || "";

        // Tabla de ítems
        const cuerpoTabla = document.getElementById('cuerpoTablaItems');
        cuerpoTabla.innerHTML = ''; 
        if (p.items && p.items.length > 0) {
            p.items.forEach(item => agregarFilaConDatos(item));
        } else {
            if (typeof agregarFilaItem === "function") agregarFilaItem(); 
        }

        if (typeof actualizarGranTotal === "function") actualizarGranTotal(); 

        // --- 3. MOSTRAR EDITOR Y CONFIGURAR REGRESO AL HISTORIAL ---
        const modalEditorElement = document.getElementById('modalGeneradorDocs');
        const modalEditor = new bootstrap.Modal(modalEditorElement);
        
        modalEditorElement.addEventListener('hidden.bs.modal', function () {
            if (bsHistorial) bsHistorial.show();
        }, { once: true });

        modalEditor.show();

    } catch (error) {
        console.error("Error al cargar proceso:", error);
        alert("No se pudieron cargar los datos.");
        if (bsHistorial) bsHistorial.show();
    }
}

