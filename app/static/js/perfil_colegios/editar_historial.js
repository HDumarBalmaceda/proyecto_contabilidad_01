async function editarProceso(id) {
    // 1. CERRAR EL HISTORIAL ANTES DE EMPEZAR
    const modalHistorialElement = document.getElementById('modalHistorial');
    let bsHistorial = bootstrap.Modal.getInstance(modalHistorialElement);
    if (bsHistorial) bsHistorial.hide();

    // Mostrar un pequeño loading de SweetAlert para que el admin sepa que estamos sincronizando proveedores
    Swal.fire({
        title: 'Cargando datos...',
        text: 'Sincronizando proveedores del colegio',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const response = await fetch(`/procesos/obtener_proceso/${id}`);
        if (!response.ok) throw new Error("No se pudo obtener el proceso");
        const p = await response.json();

        // --- NUEVA PIEZA: ACTUALIZAR PROVEEDORES ---
        // Esperamos a que la función que creaste cargue los <option> correctos
        // Usamos p.colegio_id que viene desde el servidor en el objeto del proceso
        if (typeof actualizarSelectoresProveedores === "function") {
            await actualizarSelectoresProveedores(p.colegio_id);
        }

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
        
        // Ahora estos valores sí se marcarán porque actualizarSelectoresProveedores ya creó los <option>
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

        // Dentro de editarProceso, al final del llenado de datos:
        document.getElementById('prov_principal').value = p.proveedor_id || "";
        document.getElementById('prov_2').value = p.proveedor2_id || "";
        document.getElementById('prov_3').value = p.proveedor3_id || "";

// Forzar la validación de grises
validarProveedoresDuplicados();

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
        
        Swal.close(); // Cerramos el loading manual para mostrar el modal
        modalEditorFinal.show();

        modalEditorElement.addEventListener('shown.bs.modal', function () {
            if (typeof cargarAniosModal === "function") cargarAniosModal(); 
        }, { once: true });

        // --- F) EVENTO AL CERRAR CON LIMPIEZA ANTIGRÍS ---
        modalEditorElement.addEventListener('hidden.bs.modal', function() {
            const grid = document.getElementById('gridAniosModal');
            if (grid) grid.innerHTML = ''; 
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            if (modalHistorialElement) {
                setTimeout(() => {
                    const mHist = bootstrap.Modal.getOrCreateInstance(modalHistorialElement);
                    mHist.show();
                }, 400);
            }
        }, { once: true });

        if (typeof actualizarGranTotal === "function") actualizarGranTotal();

    } catch (error) {
        console.error("Error:", error);
        Swal.fire('Error', 'No se pudieron cargar los datos o los proveedores.', 'error');
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

async function procesarExpediente() {
    // Asegúrate de tener disponible el idColegioActual (que guardas al abrir el historial)
    const idProceso = document.getElementById('proceso_id_hidden').value;
    const formulario = document.getElementById('formExpedienteCompleto');
    
    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }

    // --- CORRECCIÓN DE URL: Siempre apuntamos al colegio ---
    const url = `/procesos/guardar_proceso/${idColegioActual}`; 
    
    // --- CONVERTIR FORMULARIO A JSON ---
    const formData = new FormData(formulario);
    const data = Object.fromEntries(formData.entries());
    
    // Agregar el idProceso al objeto si existe
    data.proceso_id = idProceso || null;

    // Manejar los ítems (si tu formulario tiene múltiples filas)
    data.items = [];
    document.querySelectorAll('#cuerpoTablaItems tr').forEach(tr => {
        data.items.push({
            cantidad: tr.querySelector('[name="cant[]"]')?.value,
            codigo_clasificador: tr.querySelector('[name="cod_clasificador[]"]')?.value,
            descripcion: tr.querySelector('[name="desc[]"]')?.value,
            v_unitario: tr.querySelector('[name="v_unit[]"]')?.value,
            v_total: tr.querySelector('[name="v_total[]"]')?.value
        });
    });

    Swal.fire({
        title: 'Procesando...',
        text: 'Guardando cambios en la base de datos',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const response = await fetch(url, {
            method: 'POST', // Tu controlador de Flask solo acepta POST según el código que pasaste
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data) // Enviamos JSON puro
        });

        // Verificamos si la respuesta es OK antes de parsear JSON
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error del servidor: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            Swal.fire('¡Éxito!', 'El proceso se guardó correctamente.', 'success').then(() => {
                bootstrap.Modal.getInstance(document.getElementById('modalGeneradorDocs')).hide();
                if (typeof abrirHistorial === 'function') abrirHistorial(idColegioActual, paginaActual);
            });
        }
    } catch (error) {
        console.error("Error:", error);
        Swal.fire('Error', error.message, 'error');
    }
}

/**
 * Carga los proveedores de un colegio específico en los selectores del modal
 * @param {number} colegioId - El ID del colegio a consultar
 */
async function actualizarSelectoresProveedores(colegioId) {
    if (!colegioId) return;

    try {
        const response = await fetch(`/procesos/colegios/obtener_proveedores/${colegioId}`);
        if (!response.ok) return false;

        const proveedores = await response.json();
        const IDs_SELECTS = ['prov_principal', 'prov_2', 'prov_3'];

        // 1. Llenamos los selectores por primera vez
        IDs_SELECTS.forEach(idSelect => {
            const select = document.getElementById(idSelect);
            if (!select) return;

            const valorPrevio = select.value;
            select.innerHTML = '<option value="">Seleccione un proveedor...</option>';

            proveedores.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.nombre; 
                select.appendChild(opt);
            });

            if (valorPrevio) select.value = valorPrevio;

            // 2. Agregamos el evento para que cuando cambie, valide a los demás
            select.addEventListener('change', validarProveedoresDuplicados);
        });

        // Ejecutar la validación inicial por si ya vienen cargados desde la DB
        validarProveedoresDuplicados();

        return true;
    } catch (error) {
        console.error("❌ Error cargando proveedores:", error);
        return false;
    }
}

/**
 * Función que deshabilita las opciones ya seleccionadas en los otros selectores
 */
function validarProveedoresDuplicados() {
    const IDs_SELECTS = ['prov_principal', 'prov_2', 'prov_3'];
    
    // Obtenemos qué IDs están seleccionados actualmente (filtrando los vacíos)
    const seleccionados = IDs_SELECTS
        .map(id => document.getElementById(id).value)
        .filter(val => val !== "");

    IDs_SELECTS.forEach(idSelect => {
        const select = document.getElementById(idSelect);
        if (!select) return;

        const valorActualDeEsteSelect = select.value;

        // Recorremos todas las opciones de este SELECT
        Array.from(select.options).forEach(option => {
            if (option.value === "") return; // No deshabilitar el "Seleccione..."

            // Si la opción está seleccionada en OTRO select, la deshabilitamos
            // Pero NO la deshabilitamos si es la que este select ya tiene marcada
            if (seleccionados.includes(option.value) && option.value !== valorActualDeEsteSelect) {
                option.disabled = true;
                option.style.color = '#ccc'; // Poner en gris visualmente
            } else {
                option.disabled = false;
                option.style.color = ''; 
            }
        });
    });
}