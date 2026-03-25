async function editarProceso(id) {
    // 1. CERRAR EL HISTORIAL ANTES DE EMPEZAR
    const modalHistorialElement = document.getElementById('modalHistorial');
    let bsHistorial = bootstrap.Modal.getInstance(modalHistorialElement);
    if (bsHistorial) bsHistorial.hide();

    // Mostrar loading
    Swal.fire({
        title: 'Cargando datos...',
        text: 'Sincronizando proveedores del colegio',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // A) Obtener los datos del proceso primero
        const response = await fetch(`/procesos/obtener_proceso/${id}`);
        if (!response.ok) throw new Error("No se pudo obtener el proceso");
        const p = await response.json();

        // B) SINCRONIZACIÓN OBLIGATORIA DE PROVEEDORES
        // Usamos await para que NO siga hasta que los <option> estén creados en el DOM
        if (typeof actualizarSelectoresProveedores === "function") {
            await actualizarSelectoresProveedores(p.colegio_id);
        }

        const modalEditorElement = document.getElementById('modalGeneradorDocs');
        const formulario = document.getElementById('formExpedienteCompleto');
        
        // C) LIMPIEZA TOTAL PREVIA
        if (formulario) formulario.reset(); 
        const cuerpoTabla = document.getElementById('cuerpoTablaItems');
        if (cuerpoTabla) cuerpoTabla.innerHTML = ''; 

        // Configuración de interfaz del botón y título
        const titulo = document.getElementById('tituloModalExpediente');
        const btnAccion = document.getElementById('btnAccionExpediente');
        const textoBtn = document.getElementById('textoBtnExpediente');

        if (titulo) titulo.innerText = `Editando Proceso #${p.numero_proceso_colegio || p.id}`;
        if (btnAccion) btnAccion.className = "btn btn-warning px-4 text-dark fw-bold"; 
        if (textoBtn) textoBtn.innerText = "Actualizar Expediente";

        // D) LLENADO DE DATOS (Ahora sí es seguro asignar los Selects)
        document.getElementById('proceso_id_hidden').value = p.id;
        
        // Estos .value ya funcionarán porque actualizarSelectoresProveedores terminó su await
        document.getElementById('prov_principal').value = p.proveedor_id || "";
        document.getElementById('prov_2').value = p.proveedor2_id || "";
        document.getElementById('prov_3').value = p.proveedor3_id || "";
        
        // Otros campos
        document.querySelector('[name="valor_propuesta2"]').value = p.valor_propuesta2 || 0;
        document.querySelector('[name="valor_propuesta3"]').value = p.valor_propuesta3 || 0;
        document.getElementById('rubro_nombre').value = p.rubro_nombre || "";
        document.querySelector('[name="tipo_contrato"]').value = p.tipo_contrato || "";
        document.querySelector('[name="cdp_numero"]').value = p.cdp_numero || "";
        document.getElementById('cod_presupuestal').value = p.cod_presupuestal || "";
        document.querySelector('[name="objeto_desc"]').value = p.objeto_desc || "";
        document.getElementById('plazo_txt').value = p.plazo_txt || "";

        // Fechas
        ['f_elaboracion', 'f_publicacion', 'f_recepcion', 'f_cierre', 'f_verificacion', 'f_firma', 'f_recibido'].forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = p[f] ? p[f] : "";
        });

        // Validar grises (duplicados) después de asignar valores
        validarProveedoresDuplicados();

        // E) TABLA DE ÍTEMS
        if (p.items && p.items.length > 0) {
            p.items.forEach(item => {
                if (typeof agregarFilaConDatos === "function") agregarFilaConDatos(item); 
            });
        } else {
            if (typeof agregarFilaItem === "function") agregarFilaItem(); 
        }

        // F) MOSTRAR MODAL
        let modalEditorFinal = bootstrap.Modal.getOrCreateInstance(modalEditorElement);
        Swal.close(); 
        modalEditorFinal.show();

        if (typeof actualizarGranTotal === "function") actualizarGranTotal();

    } catch (error) {
        console.error("Error detallado:", error);
        Swal.fire('Error', 'No se pudieron cargar los datos. Verifica la consola.', 'error');
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

// EN editar_historial.js
async function guardarProcesoEnBaseDeDatos(datosParaEnviar, colegioId, esNuevo = false) {
    const url = `/procesos/guardar_proceso/${colegioId}`;
    
    // Capturar el CSRF Token para la seguridad de Flask
    const csrfToken = document.querySelector('input[name="csrf_token"]')?.value 
                      || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    Swal.fire({
        title: esNuevo ? 'Guardando Proceso...' : 'Actualizando Proceso...',
        text: 'Sincronizando con la base de datos',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken 
            },
            body: JSON.stringify(datosParaEnviar)
        });

        if (!response.ok) {
            const errorTexto = await response.text();
            let mensajeError = "Error en el servidor";
            try {
                const errorJson = JSON.parse(errorTexto);
                mensajeError = errorJson.message || errorJson.error || mensajeError;
            } catch (e) {
                if (errorTexto.includes("CSRF")) mensajeError = "Sesión expirada o error de seguridad. Recarga la página.";
            }
            throw new Error(mensajeError);
        }

        const result = await response.json();

        if (result.success) {
            if (esNuevo) {
                Swal.close(); 
                if (typeof opcionesDescargaHistorial === 'function') {
                    opcionesDescargaHistorial(result.proceso_id);
                }
            } else {
                Swal.fire({
                    icon: 'success',
                    title: '¡Hecho!',
                    text: 'El proceso ha sido actualizado.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    const modalElement = document.getElementById('modalGeneradorDocs');
                    if (modalElement) {
                        const modalInstance = bootstrap.Modal.getInstance(modalElement);
                        if (modalInstance) modalInstance.hide();
                    }
                    if (typeof abrirHistorial === 'function') {
                        abrirHistorial(colegioId, typeof paginaActual !== 'undefined' ? paginaActual : 1);
                    }
                });
            }
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'No se pudo guardar',
            text: error.message,
            confirmButtonText: 'Cerrar'
        });
    }
}
window.guardarProcesoEnBaseDeDatos = guardarProcesoEnBaseDeDatos;


/**
 * Carga los proveedores de un colegio específico en los selectores del modal
 * @param {number} colegioId - El ID del colegio a consultar
 */
async function actualizarSelectoresProveedores(colegioId) {
    if (!colegioId) return false;

    try {
        const response = await fetch(`/procesos/colegios/obtener_proveedores/${colegioId}`);
        if (!response.ok) return false;

        const proveedores = await response.json();
        const IDs_SELECTS = ['prov_principal', 'prov_2', 'prov_3'];

        // Usamos una promesa para asegurar que todo se llene antes de seguir
        for (const idSelect of IDs_SELECTS) {
            const select = document.getElementById(idSelect);
            if (!select) continue;

            const valorPrevio = select.value;
            select.innerHTML = '<option value="">Seleccione un proveedor...</option>';

            proveedores.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;

                // Lógica de nombre que NO falle si faltan campos
                let nombreLimpio = p.nombre_para_mostrar || p.nombre;
                
                if (!nombreLimpio || nombreLimpio === "0" || nombreLimpio === "0000000000") {
                    if (p.primer_nombre && p.primer_nombre !== "0") {
                        nombreLimpio = `${p.primer_nombre} ${p.primer_apellido || ''}`.trim();
                    } else {
                        nombreLimpio = p.razon_social !== "0" ? p.razon_social : `NIT: ${p.documento}`;
                    }
                }

                opt.textContent = nombreLimpio;
                select.appendChild(opt);
            });

            if (valorPrevio) select.value = valorPrevio;
            
            // Refrescar eventos
            select.removeEventListener('change', validarProveedoresDuplicados);
            select.addEventListener('change', validarProveedoresDuplicados);
        }

        validarProveedoresDuplicados();
        return true; // ÉXITO TOTAL
    } catch (error) {
        console.error("❌ Error:", error);
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