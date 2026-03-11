async function editarProceso(id) {
    // 1. CERRAR EL HISTORIAL ANTES DE EMPEZAR
    const modalHistorialElement = document.getElementById('modalHistorial');
    let bsHistorial = bootstrap.Modal.getInstance(modalHistorialElement);
    if (bsHistorial) bsHistorial.hide();

    try {
        const response = await fetch(`/procesos/obtener_proceso/${id}`);
        if (!response.ok) throw new Error("No se pudo obtener el proceso");
        const p = await response.json();

        const modalEditorElement = document.getElementById('modalGeneradorDocs');
        const formulario = document.getElementById('formExpedienteCompleto');
        
        // --- A) LIMPIEZA Y APARIENCIA DEL BOTÓN ---
        if (formulario) formulario.reset(); 
        const cuerpoTabla = document.getElementById('cuerpoTablaItems');
        if (cuerpoTabla) cuerpoTabla.innerHTML = ''; 

        const titulo = document.getElementById('tituloModalExpediente');
        const btnAccion = document.getElementById('btnAccionExpediente');
        const textoBtn = document.getElementById('textoBtnExpediente');
        const iconoBtn = document.getElementById('iconoBtnExpediente');

        if (titulo) titulo.innerText = `Editando Proceso #${p.numero_proceso_colegio || p.id}`;
        if (btnAccion) btnAccion.className = "btn btn-warning px-4 text-dark fw-bold"; 
        if (textoBtn) textoBtn.innerText = "Actualizar Expediente";
        if (iconoBtn) iconoBtn.className = "bi bi-arrow-clockwise me-2";

        // --- B) SINCRONIZACIÓN DE VIGENCIA ---
        const vigenciaDB = p.vigencia || 2026;
        const inputOcultoVigencia = document.getElementById('modalVigenciaInput');
        const textoBotonAnio = document.getElementById('anioTextoModal');

        if (inputOcultoVigencia) inputOcultoVigencia.value = vigenciaDB;
        if (textoBotonAnio) textoBotonAnio.innerText = vigenciaDB;

        // --- C) LLENAR FORMULARIO ---
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

        // --- D) TABLA DE ÍTEMS ---
        if (p.items && p.items.length > 0) {
            p.items.forEach(item => {
                if (typeof agregarFilaConDatos === "function") agregarFilaConDatos(item); 
            });
        } else {
            if (typeof agregarFilaItem === "function") agregarFilaItem(); 
        }

        // --- E) MOSTRAR MODAL Y REFORZAR AÑOS ---
        let modalEditorFinal = bootstrap.Modal.getOrCreateInstance(modalEditorElement);
        if (typeof cargarAniosModal === "function") cargarAniosModal();
        
        modalEditorFinal.show();

        modalEditorElement.addEventListener('shown.bs.modal', function () {
            if (typeof cargarAniosModal === "function") cargarAniosModal(); 
        }, { once: true });

        // --- F) EVENTO AL CERRAR CON LIMPIEZA ANTIGRÍS ---
        modalEditorElement.addEventListener('hidden.bs.modal', function() {
            // 1. Limpieza de datos
            const grid = document.getElementById('gridAniosModal');
            if (grid) grid.innerHTML = ''; 
            
            // 2. ELIMINAR FANTASMAS GRISES (Backdrops)
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            // 3. Volver al historial con tiempo suficiente
            if (modalHistorialElement) {
                setTimeout(() => {
                    const mHist = bootstrap.Modal.getOrCreateInstance(modalHistorialElement);
                    mHist.show();
                }, 400); // 400ms es el tiempo ideal para que no choquen
            }
        }, { once: true });

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


