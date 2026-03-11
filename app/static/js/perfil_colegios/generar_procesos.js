function cargarAniosModal() {
    const contenedor = document.getElementById('gridAniosModal');
    const inputOculto = document.getElementById('modalVigenciaInput');
    const textoBoton = document.getElementById('anioTextoModal');
    
     console.log("cargarAniosModal se ejecutó. Valor detectado en el input:", inputOculto ? inputOculto.value : "NO EXISTE EL INPUT");
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

function abrirGeneradorDocs() {
    // --- NUEVO: Ya no dependemos del selector del perfil ---
    const anioPredeterminado = 2026; 

    // 1. Limpiamos el ID oculto (Esencial para que sea un proceso NUEVO y no una edición)
    const inputIdOculto = document.getElementById('proceso_id_hidden');
    if (inputIdOculto) inputIdOculto.value = ""; 

    // 2. Resetear Textos y Colores del Modal a modo "NUEVO"
    const titulo = document.getElementById('tituloModalExpediente');
    const iconoTitulo = document.getElementById('iconoModalExpediente');
    const textoBtn = document.getElementById('textoBtnExpediente');
    const btnAccion = document.getElementById('btnAccionExpediente');

    if (titulo) titulo.innerText = "Generar Nuevo Expediente";
    if (iconoTitulo) iconoTitulo.className = "bi bi-file-earmark-plus me-2 text-primary";
    if (textoBtn) textoBtn.innerText = "Generar Expediente";
    if (btnAccion) btnAccion.className = "btn btn-success px-4";

    // 3. Resetear el Formulario y la Tabla de Ítems
    const formulario = document.getElementById('formExpedienteCompleto');
    if (formulario) {
        formulario.reset();
        const cuerpoTabla = document.getElementById('cuerpoTablaItems');
        if (cuerpoTabla) cuerpoTabla.innerHTML = '';
        if (typeof agregarFilaItem === "function") agregarFilaItem();
    }

    // 4. Configurar la VIGENCIA predeterminada en el Modal
    const inputVigenciaModal = document.getElementById('modalVigenciaInput');
    const textoVigenciaModal = document.getElementById('anioTextoModal');
    
    if (inputVigenciaModal) inputVigenciaModal.value = anioPredeterminado;
    if (textoVigenciaModal) textoVigenciaModal.innerText = anioPredeterminado;

    // 5. Mostrar el Modal
    const modalElement = document.getElementById('modalGeneradorDocs');
    if (modalElement) {
        const myModal = new bootstrap.Modal(modalElement);
        myModal.show();

        // 6. LANZAR LA CARGA DE AÑOS (con el scroll al 2026)
        setTimeout(() => {
            cargarAniosModal(); // Esta es la función que configuramos antes
        }, 300);
    }
}
function recalcularFila(input) {
    const fila = input.closest('tr');
    const cant = parseFloat(fila.querySelector('[name="cant[]"]').value) || 0;
    const unit = parseFloat(fila.querySelector('[name="v_unit[]"]').value) || 0;
    
    fila.querySelector('[name="v_total[]"]').value = (cant * unit);
    actualizarGranTotal();
}

function actualizarGranTotal() {
    let sumaTotal = 0;
    document.querySelectorAll('[name="v_total[]"]').forEach(input => {
        sumaTotal += parseFloat(input.value) || 0;
    });

    const display = document.getElementById('gran_total_display');
    if (display) {
        // Formato moneda Colombia
        display.value = sumaTotal.toLocaleString('es-CO');
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
    const colegioId = obtenerColegioId();

    // 2. Recolectar datos con LIMPIEZA DE NULOS
    const formData = new FormData(formulario);
    const datosParaEnviar = {};

    for (let [key, value] of formData.entries()) {
        // Si el valor está vacío, enviamos null en lugar de ""
        // Esto evita que el backend falle al intentar procesar fechas o IDs vacíos
        if (value === "" || value === undefined) {
            datosParaEnviar[key] = null;
        } else {
            datosParaEnviar[key] = value;
        }
    }

    // --- CORRECCIONES ESTRUCTURALES ---

    // A. Vigencia como número
    const inputVigencia = document.getElementById('modalVigenciaInput');
    datosParaEnviar.vigencia = inputVigencia ? parseInt(inputVigencia.value) : 2026;

    // B. Asegurar proveedor_id (Clave para la base de datos)
    if (datosParaEnviar.prov_principal) {
        datosParaEnviar.proveedor_id = datosParaEnviar.prov_principal;
    }

    // C. ID de edición (Aseguramos que sea número o null real)
    const idEdicion = document.getElementById('proceso_id_hidden')?.value;
    datosParaEnviar.proceso_id = (idEdicion && idEdicion !== "") ? parseInt(idEdicion) : null;

    // 3. Recolectar la tabla de Ítems
    const items = [];
    document.querySelectorAll('#cuerpoTablaItems tr').forEach(fila => {
        const descInput = fila.querySelector('[name="desc[]"]');
        
        if (descInput && descInput.value.trim() !== "") {
            const cant = parseFloat(fila.querySelector('[name="cant[]"]').value) || 0;
            const vUnit = parseFloat(fila.querySelector('[name="v_unit[]"]').value) || 0;
            const vTotal = parseFloat(fila.querySelector('[name="v_total[]"]').value) || 0;

            items.push({
                cantidad: cant,
                codigo_clasificador: fila.querySelector('[name="cod_clasificador[]"]').value || null, 
                descripcion: descInput.value.trim(),
                v_unitario: vUnit,
                v_total: vTotal
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

    // 5. Envío según el caso
    console.log("Datos finales a enviar:", datosParaEnviar); 

    if (datosParaEnviar.proceso_id) {
        actualizarProcesoExistente(datosParaEnviar);
    } else {
        abrirOpcionesDescarga(datosParaEnviar, colegioId);
    }
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
    if (!fElab) return;

    let fecha = new Date(fElab + 'T00:00:00');
    
    const sumarDias = (fechaBase, dias) => {
        let res = new Date(fechaBase);
        res.setDate(res.getDate() + dias);
        return res.toISOString().split('T')[0];
    };

    // Lógica secuencial
    document.getElementById('f_publicacion').value = sumarDias(fecha, 1);
    document.getElementById('f_recepcion').value = sumarDias(fecha, 2);
    document.getElementById('f_cierre').value = sumarDias(fecha, 3);
    document.getElementById('f_verificacion').value = sumarDias(fecha, 4);
    
    const fechaFirma = sumarDias(fecha, 5);
    document.getElementById('f_firma').value = fechaFirma;

    // Llamamos a la nueva función para calcular la fecha de satisfacción
    actualizarFechaSatisfaccion();
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
            <td><input type="text" name="cod_clasificador[]" class="form-control form-control-sm"></td>
            <td><input type="text" name="desc[]" class="form-control form-control-sm"></td>
            <td><input type="number" name="v_unit[]" class="form-control form-control-sm text-end" value="0" onchange="recalcularFila(this)"></td>
            <td><input type="number" name="v_total[]" class="form-control form-control-sm text-end bg-light" readonly value="0"></td>
            <td class="text-center"><button type="button" class="btn btn-link btn-sm text-danger" onclick="this.closest('tr').remove(); recalcularTotalGeneral();"><i class="bi bi-trash"></i></button></td>
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
    let colegioId = document.getElementById('colegio_id_input')?.value; 
    if (!colegioId) {
        const pathSegments = window.location.pathname.split('/').filter(s => s !== "");
        // Usamos pathSegments que es la variable real
        colegioId = pathSegments[pathSegments.length - 1]; 
    }
    return colegioId;
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