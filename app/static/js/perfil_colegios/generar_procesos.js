function cargarAniosModal() {
    const contenedor = document.getElementById('gridAniosModal');
    const inputOculto = document.getElementById('modalVigenciaInput');
    const textoBoton = document.getElementById('anioTextoModal');
    
     
    if (!contenedor || !inputOculto) return;

    contenedor.innerHTML = '';
    
    // BLINDAJE: Forzamos la lectura del valor actual. 
    // Si viene de la DB como número, parseInt lo asegura.
    let valorActual = inputOculto.value.trim();
    const anioSeleccionado = parseInt(valorActual) || 2026;

    // Sincronizamos el texto del botón de inmediato para que no se vea vacío o viejo
    if (textoBoton) textoBoton.innerText = anioSeleccionado;

    // RANGO INTELIGENTE
    let anioInicio = Math.min(2020, anioSeleccionado - 5);
    let anioFin = Math.max(2035, anioSeleccionado + 5);

    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "repeat(4, 1fr)";
    contenedor.style.gap = "5px";
    contenedor.style.maxHeight = "200px"; 
    contenedor.style.overflowY = "auto";
    contenedor.style.padding = "10px";

    for (let i = anioInicio; i <= anioFin; i++) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.innerText = i;
        boton.id = `btn-modal-anio-${i}`;
        
        // Comparación estricta de números
        const esSeleccionado = (i === anioSeleccionado);
        boton.className = 'btn btn-sm ' + (esSeleccionado ? 'btn-primary text-white fw-bold shadow-sm' : 'btn-outline-primary');
        
        boton.onclick = function() {
            contenedor.querySelectorAll('button').forEach(b => {
                b.className = 'btn btn-sm btn-outline-primary';
            });
            this.className = 'btn btn-sm btn-primary text-white fw-bold shadow-sm';
            
            // Guardamos el valor y actualizamos la interfaz
            inputOculto.value = i;
            if(textoBoton) textoBoton.innerText = i;
        };

        contenedor.appendChild(boton);
    }

    // Scroll mejorado: Usamos un delay pequeño para asegurar que el DOM esté listo
    setTimeout(() => {
        const btnActivo = document.getElementById(`btn-modal-anio-${anioSeleccionado}`);
        if (btnActivo) {
            btnActivo.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, 100);
}

// --- FUNCIONES GLOBALES (FUERA DE TODO BLOQUE) ---

async function abrirGeneradorDocs() {
    const anioPredeterminado = 2026; 

    // 1. Limpiamos el ID oculto
    const inputIdOculto = document.getElementById('proceso_id_hidden');
    if (inputIdOculto) inputIdOculto.value = ""; 

    // 2. Resetear Textos, Iconos y Botones al modo "NUEVO"
    const titulo = document.getElementById('tituloModalExpediente');
    const iconoTitulo = document.getElementById('iconoModalExpediente');
    const textoBtn = document.getElementById('textoBtnExpediente');
    const btnAccion = document.getElementById('btnAccionExpediente');

    if (titulo) titulo.innerText = "Generar Nuevo Expediente";
    if (iconoTitulo) iconoTitulo.className = "bi bi-file-earmark-plus me-2 text-primary";
    if (textoBtn) textoBtn.innerText = "Generar Expediente";
    if (btnAccion) {
        btnAccion.className = "btn btn-success px-4";
        btnAccion.onclick = function() { procesarExpediente(); };
    }

    // 3. Resetear el Formulario y Limpieza de rastro
    const formulario = document.getElementById('formExpedienteCompleto');
    if (formulario) {
        formulario.reset(); 
        const inputLink = formulario.querySelector('[name="link_secop"]');
            if (inputLink) inputLink.value = "";

        // --- NUEVO: LÓGICA DE AUTOCOMPLETADO DE CDP PARA PROCESOS NUEVOS ---
        const colegioId = obtenerColegioId() || (typeof idColegioActual !== 'undefined' ? idColegioActual : null);
        const inputCDP = formulario.querySelector('[name="cdp_numero"]');

        if (colegioId && inputCDP) {
            try {
                // Llamamos al nuevo endpoint que creaste en el controlador
                const response = await fetch(`/reportes/procesos/get_proximo_numero/${colegioId}`);
                const data = await response.json();
                
                if (data.proximo_numero) {
                    // Formateamos a 3 dígitos (ej: 1 -> 001)
                    inputCDP.value = String(data.proximo_numero).padStart(3, '0');
                }
            } catch (error) {
                console.error("Error al obtener el número sugerido:", error);
                // Si falla, al menos dejamos el campo limpio o con 001
            }
        }
        // -----------------------------------------------------------------

        // Re-limpieza de tabla de ítems
        const cuerpoTabla = document.getElementById('cuerpoTablaItems');
        if (cuerpoTabla) {
            cuerpoTabla.innerHTML = '';
            if (typeof agregarFilaItem === "function") agregarFilaItem();
        }

        const displayTotal = document.getElementById('gran_total_display');
        if (displayTotal) displayTotal.value = "0";

        const guiaPlazo = document.getElementById('guia_plazo');
        if (guiaPlazo) {
            guiaPlazo.innerText = "Escribe el número de días para calcular la fecha final.";
            guiaPlazo.className = "form-text text-muted";
        }

        formulario.querySelectorAll('.select-proveedor').forEach(select => {
            Array.from(select.options).forEach(opt => {
                opt.disabled = false;
                opt.style.color = '';
            });
        });
    }

    // 4. Configurar la VIGENCIA
    const inputVigenciaModal = document.getElementById('modalVigenciaInput');
    const textoVigenciaModal = document.getElementById('anioTextoModal');
    
    if (inputVigenciaModal) inputVigenciaModal.value = anioPredeterminado;
    if (textoVigenciaModal) textoVigenciaModal.innerText = anioPredeterminado;

    // 5. Mostrar el Modal
    const modalElement = document.getElementById('modalGeneradorDocs');
    if (modalElement) {
        const myModal = bootstrap.Modal.getOrCreateInstance(modalElement);
        myModal.show();

        // 6. Lanzar la carga de años
        setTimeout(() => {
            if (typeof cargarAniosModal === "function") cargarAniosModal();
        }, 300);
    }
}

function calcularCronograma() {
    const fElaboracionVal = document.getElementById('f_elaboracion').value;
    if (!fElaboracionVal) return;

    // Usar 'T00:00:00' para evitar desfases de zona horaria
    let fechaBase = new Date(fElaboracionVal + 'T00:00:00');
    const format = (d) => d.toISOString().split('T')[0];

    document.getElementById('f_publicacion').value = format(fechaBase);
    
    let fRec = new Date(fechaBase);
    fRec.setDate(fRec.getDate() + 1);
    document.getElementById('f_recepcion').value = format(fRec);

    let fCierre = new Date(fechaBase);
    fCierre.setDate(fCierre.getDate() + 2);
    const fCierreStr = format(fCierre);
    document.getElementById('f_cierre').value = fCierreStr;
    document.getElementById('f_verificacion').value = fCierreStr;

    let fFirma = new Date(fechaBase);
    fFirma.setDate(fFirma.getDate() + 3);
    document.getElementById('f_firma').value = format(fFirma);
}

async function procesarExpediente() {
    const formulario = document.getElementById('formExpedienteCompleto');
    if (!formulario) return;

    // 1. Obtener Colegio ID
    // MEJORA: Si obtenerColegioId() falla, usamos la global idColegioActual
    const colegioId = obtenerColegioId() || idColegioActual;

    if (!colegioId || colegioId === "null") {
        Swal.fire('Error', 'No se pudo determinar el ID del colegio.', 'error');
        return;
    }

    // 2. Recolectar datos con LIMPIEZA DE NULOS
    const formData = new FormData(formulario);
    const datosParaEnviar = {};

    for (let [key, value] of formData.entries()) {
        if (value === "" || value === undefined) {
            datosParaEnviar[key] = null;
        } else {
            datosParaEnviar[key] = value;
        }
    }

    // --- AGREGAMOS VALIDACIÓN DEL LINK SECOP (Opcional pero recomendada) ---
    if (datosParaEnviar.link_secop && !datosParaEnviar.link_secop.startsWith('http')) {
        Swal.fire('Atención', 'El link del SECOP debe empezar con http:// o https://', 'warning');
        return;
    }

    // --- CORRECCIONES ESTRUCTURALES ---
    const inputVigencia = document.getElementById('modalVigenciaInput');
    datosParaEnviar.vigencia = inputVigencia ? parseInt(inputVigencia.value) : 2026;

    if (datosParaEnviar.prov_principal) {
        datosParaEnviar.proveedor_id = datosParaEnviar.prov_principal;
    }

    const idEdicion = document.getElementById('proceso_id_hidden')?.value;
    datosParaEnviar.proceso_id = (idEdicion && idEdicion !== "") ? parseInt(idEdicion) : null;

    // 3. Recolectar la tabla de Ítems
    const items = [];
    document.querySelectorAll('#cuerpoTablaItems tr').forEach(fila => {
        const descInput = fila.querySelector('[name="desc[]"]');
        if (descInput && descInput.value.trim() !== "") {
            items.push({
                cantidad: parseFloat(fila.querySelector('[name="cant[]"]').value) || 0,
                codigo_clasificador: fila.querySelector('[name="cod_clasificador[]"]').value || null, 
                descripcion: descInput.value.trim(),
                v_unitario: parseFloat(fila.querySelector('[name="v_unit[]"]').value) || 0,
                v_total: parseFloat(fila.querySelector('[name="v_total[]"]').value) || 0
            });
        }
    });

    datosParaEnviar.items = items;

    // 4. Validaciones mínimas
    if (!datosParaEnviar.proveedor_id) {
        Swal.fire('Atención', 'Debes seleccionar el proveedor principal', 'warning');
        return;
    }

    if (items.length === 0) {
        Swal.fire('Atención', 'Debe agregar al menos un ítem con descripción', 'warning');
        return;
    }

    // 5. ENVÍO UNIFICADO (Aquí está la magia)

    // Determinamos si es nuevo o edición
    const esNuevo = !datosParaEnviar.proceso_id;

    // LLAMAMOS A LA FUNCIÓN DE editar_historial.js
    // Esta se encarga del fetch y de abrir la descarga si es nuevo
    guardarProcesoEnBaseDeDatos(datosParaEnviar, colegioId, esNuevo);
}
/**
 * LÓGICA PARA EL GENERADOR DE EXPEDIENTES CONTRACTUALES
 */

document.addEventListener('DOMContentLoaded', function() {
    // 1. FILTRADO DE PROVEEDORES REPETIDOS
    const selectsProveedores = document.querySelectorAll('.select-proveedor');
    
    selectsProveedores.forEach(select => {
        select.addEventListener('change', function() {
            const seleccionados = Array.from(selectsProveedores)
                .map(s => s.value)
                .filter(val => val !== "");

            selectsProveedores.forEach(selectActual => {
                const valorActual = selectActual.value;
                Array.from(selectActual.options).forEach(option => {
                    if (option.value === "") return;
                    
                    const enUsoEnOtro = seleccionados.includes(option.value) && option.value !== valorActual;
                    option.disabled = enUsoEnOtro;
                    option.style.color = enUsoEnOtro ? '#ccc' : '';
                });
            });
        });
    });

    // 2. CÁLCULO AUTOMÁTICO DE CRONOGRAMA
window.calcularCronograma = function() {
    const fElab = document.getElementById('f_elaboracion').value;
    
    // 1. Verificación de seguridad: si no hay fecha, no hacemos nada
    if (!fElab) return;

    // 2. Crear la fecha base de forma segura (YYYY-MM-DD)
    // Usamos split y new Date(y, m, d) para evitar problemas de zona horaria
    const partes = fElab.split('-');
    const fechaBase = new Date(partes[0], partes[1] - 1, partes[2]);

    // 3. Función sumarDias mejorada con validación
    const sumarDias = (fechaReferencia, dias) => {
        if (isNaN(fechaReferencia.getTime())) return ""; // Si la fecha es inválida, abortar
        
        let res = new Date(fechaReferencia);
        res.setDate(res.getDate() + dias);
        
        // Verificamos que el resultado sea una fecha válida antes de convertir a ISO
        if (isNaN(res.getTime())) return "";
        
        return res.toISOString().split('T')[0];
    };

    // 4. Lógica secuencial (Capturamos los elementos para evitar errores si no existen)
    const campos = {
        'f_publicacion': 1,
        'f_recepcion': 2,
        'f_cierre': 3,
        'f_verificacion': 4,
        'f_firma': 5
    };

    for (const [id, dias] of Object.entries(campos)) {
        const el = document.getElementById(id);
        if (el) {
            el.value = sumarDias(fechaBase, dias);
        }
    }

    // Llamamos a la nueva función para calcular la fecha de satisfacción
    if (typeof actualizarFechaSatisfaccion === "function") {
        actualizarFechaSatisfaccion();
    }
};

// NUEVA FUNCIÓN: Calcula satisfacción basado en Plazo + Fecha Firma
window.actualizarFechaSatisfaccion = function() {
    const fFirmaVal = document.getElementById('f_firma').value;
    const plazoInput = document.getElementById('plazo_txt');
    const inputSatisfaccion = document.getElementById('f_recibido');
    const guia = document.getElementById('guia_plazo'); // Referencia al pequeño texto

    if (!fFirmaVal || !plazoInput.value.trim()) {
        inputSatisfaccion.value = "";
        guia.innerText = "Escribe el número de días para calcular la fecha final.";
        guia.className = "form-text text-muted"; 
        return;
    }

    const matches = plazoInput.value.match(/\d+/);
    
    if (matches) {
        const diasPlazo = parseInt(matches[0]);
        let fechaSatisfaccion = new Date(fFirmaVal + 'T00:00:00');
        fechaSatisfaccion.setDate(fechaSatisfaccion.getDate() + diasPlazo);
        
        inputSatisfaccion.value = fechaSatisfaccion.toISOString().split('T')[0];
        
        // El texto ahora confirma el cálculo en color verde (success)
        guia.innerHTML = `<i class="bi bi-info-circle"></i> Sumando <b>${diasPlazo} días</b> a la fecha de firma.`;
        guia.className = "form-text text-success";
    } else {
        inputSatisfaccion.value = "";
        // Si no hay números, le recordamos amablemente
        guia.innerText = "Recuerda incluir el número de días (Ej: 05).";
        guia.className = "form-text text-warning";
    }
};

// Escuchador para que cuando escriban el plazo, la fecha se mueva sola
document.querySelector('[name="plazo_txt"]').addEventListener('input', actualizarFechaSatisfaccion);

    // 3. GESTIÓN DE LA TABLA DE ÍTEMS
    window.agregarFilaItem = function() {
        const tbody = document.getElementById('cuerpoTablaItems');
        const nuevaFila = document.createElement('tr');
        nuevaFila.innerHTML = `
            <td><input type="number" name="cant[]" class="form-control form-control-sm text-center" value="1" onchange="recalcularFila(this)"></td>
        <td><input type="text" name="cod_clasificador[]" class="form-control form-control-sm" placeholder="Código..."></td>
        <td><input type="text" name="desc[]" class="form-control form-control-sm" placeholder="Descripción..."></td>
        <td><input type="number" name="v_unit[]" class="form-control form-control-sm text-end" value="0" onchange="recalcularFila(this)"></td>
        <td><input type="number" name="v_total[]" class="form-control form-control-sm text-end bg-light" readonly value="0"></td>
        <td class="text-center">
            <button type="button" class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove(); actualizarGranTotal();">
                <i class="bi bi-x-circle-fill"></i>
            </button>
        </td>
        `;
        tbody.appendChild(nuevaFila);
    };

    window.recalcularFila = function(input) {
        const fila = input.closest('tr');
        const cant = parseFloat(fila.querySelector('[name="cant[]"]').value) || 0;
        const unit = parseFloat(fila.querySelector('[name="v_unit[]"]').value) || 0;
        fila.querySelector('[name="v_total[]"]').value = (cant * unit).toFixed(0);
        recalcularTotalGeneral();
    };

    window.recalcularTotalGeneral = function() {
        let total = 0;
        document.querySelectorAll('[name="v_total[]"]').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        document.getElementById('gran_total_display').value = new Intl.NumberFormat('es-CO').format(total);
    };
});


function obtenerColegioId() {
    // 1. Intentar obtenerlo de un input oculto que DEBE existir en el modal
    const inputId = document.getElementById('colegio_id_hidden');
    if (inputId && inputId.value && inputId.value !== "null") {
        return inputId.value;
    }

    // 2. Intentar obtenerlo de la variable global si tiene un número
    if (typeof idColegioActual !== 'undefined' && idColegioActual && !isNaN(idColegioActual)) {
        return idColegioActual;
    }

    // 3. Como último recurso, intentar la URL (solo si el último segmento es un número)
    const pathSegments = window.location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    if (!isNaN(lastSegment)) {
        return lastSegment;
    }

    return null; // Si llega aquí, es que no lo encontró
}

async function actualizarProcesoExistente(datos) {
    try {
        const idDelColegio = obtenerColegioId(); 
        
        Swal.fire({
            title: 'Actualizando...',
            text: 'Guardando los cambios en el servidor',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const response = await fetch(`/procesos/guardar_proceso/${idDelColegio}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        // Verificamos si la respuesta fue exitosa (no es 500, 404, etc)
        if (!response.ok) {
            const errorTexto = await response.text();
            throw new Error(`Error en el servidor (${response.status})`);
        }

        const result = await response.json();

        // CAMBIO IMPORTANTE: Validamos 'status' en lugar de 'success'
        if (result.status === 'success' || result.success) {
            
            // --- CIERRE SEGURO DEL MODAL ---
            const modalElement = document.getElementById('modalGeneradorDocs');
            let modalBS = bootstrap.Modal.getInstance(modalElement);
            
            if (modalBS) {
                modalBS.hide();
            } else {
                modalElement.style.display = 'none';
                document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                document.body.classList.remove('modal-open');
                document.body.style.paddingRight = '0px';
            }

            await Swal.fire({
                icon: 'success',
                title: '¡Proceso Actualizado!',
                text: 'Los cambios se han guardado correctamente.',
                timer: 1500,
                showConfirmButton: false
            });

            // Reabrir historial o recargar
            if (typeof window.abrirHistorial === "function") {
                window.abrirHistorial(idDelColegio); 
            } else {
                location.reload(); 
            }
        } else {
            // Si el servidor respondió pero con un error lógico
            throw new Error(result.message || "Error desconocido al actualizar");
        }

    } catch (error) {
        console.error("Error detallado:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error de Actualización',
            text: error.message
        });
    }
}

// --- VIGILANTE DE APERTURA DE MODAL ---
// Este código se ejecuta CADA VEZ que el modal termina de abrirse
const miModal = document.getElementById('modalGeneradorDocumentos');

if (miModal) {
    miModal.addEventListener('shown.bs.modal', function () {
        
        // Aquí llamamos a la función que dibuja los cuadritos azules
        if (typeof cargarAniosModal === "function") {
            cargarAniosModal(); 
        } else {
            console.error("❌ Error: La función cargarAniosModal no está definida en este archivo.");
        }
    });
}