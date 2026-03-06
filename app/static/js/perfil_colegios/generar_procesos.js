(function cargarCalendarioAnios() {
    const contenedor = document.getElementById('gridAnios');
    const inputOculto = document.getElementById('vigenciaProceso');
    const textoBoton = document.getElementById('anioSeleccionadoTexto');
    if (!contenedor) return;

    const anioActual = new Date().getFullYear();
    const inicio = 1900; 
    const fin = 3000;

    contenedor.innerHTML = ''; 
    contenedor.style.maxHeight = "250px"; 
    contenedor.style.overflowY = "auto";  
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "repeat(4, 1fr)"; 
    contenedor.style.gap = "5px";
    contenedor.className = "p-2";

    for (let i = inicio; i <= fin; i++) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.innerText = i;
        boton.id = `anio-${i}`; 
        boton.className = 'btn btn-sm btn-outline-primary fw-bold';
        
        if (i === anioActual) {
            boton.classList.replace('btn-outline-primary', 'btn-primary');
            boton.classList.add('text-white');
            inputOculto.value = i;
            textoBoton.innerText = i;
        }

        boton.onclick = function() {
            contenedor.querySelectorAll('button').forEach(b => {
                b.className = 'btn btn-sm btn-outline-primary fw-bold';
            });
            this.className = 'btn btn-sm btn-primary text-white fw-bold';
            inputOculto.value = i;
            textoBoton.innerText = i;
        };
        contenedor.appendChild(boton);
    }

    const dropdownBtn = document.getElementById('btnDesplegarAnios');
    if(dropdownBtn) {
        dropdownBtn.addEventListener('shown.bs.dropdown', () => {
            const btnActivo = document.getElementById(`anio-${inputOculto.value}`);
            if (btnActivo) btnActivo.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    }
})();

// --- FUNCIONES GLOBALES (FUERA DE TODO BLOQUE) ---

function abrirGeneradorDocs() {
    const selector = document.getElementById('vigenciaProceso');
    if (!selector) return;

    const modalElement = document.getElementById('modalGeneradorDocs');
    if (modalElement) {
        // Actualizar vigencia en el input oculto del formulario antes de abrir
        document.getElementById('modalVigenciaInput').value = selector.value;
        new bootstrap.Modal(modalElement).show();
    }
}

function agregarFilaItem() {
    const tbody = document.getElementById('cuerpoTablaItems');
    if (!tbody) return;

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
    actualizarGranTotal();
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
    let colegioId = document.getElementById('colegio_id_input')?.value; 
    if (!colegioId) {
        const pathSegments = window.location.pathname.split('/').filter(s => s !== "");
        colegioId = pathSegments[pathSegments.length - 1];
    }

    // 2. Recolectar datos básicos del formulario
    const formData = new FormData(formulario);
    const datosParaEnviar = Object.fromEntries(formData.entries());

    // 3. Recolectar la tabla de Ítems
    const items = [];
    document.querySelectorAll('#cuerpoTablaItems tr').forEach(fila => {
        const descInput = fila.querySelector('[name="desc[]"]');
        if (descInput && descInput.value.trim() !== "") {
            items.push({
                cantidad: fila.querySelector('[name="cant[]"]').value,
                codigo_clasificador: fila.querySelector('[name="cod_clasificador[]"]').value, 
                descripcion: descInput.value,
                v_unitario: fila.querySelector('[name="v_unit[]"]').value,
                v_total: fila.querySelector('[name="v_total[]"]').value
            });
        }
    });

    datosParaEnviar.items = items;

    // 4. Validaciones básicas
    if (!datosParaEnviar.proveedor_id) {
        Swal.fire('Atención', 'Debes seleccionar un proveedor', 'warning');
        return;
    }

    if (items.length === 0) {
        Swal.fire('Atención', 'Debe agregar al menos un ítem a la tabla', 'warning');
        return;
    }

    // 5. --- EL CAMBIO ESTÁ AQUÍ ---
    // En lugar de enviar los datos de una vez, llamamos a la función 
    // que está en tu archivo nuevo (exportar_documentos.js)
    // Ella se encargará de preguntar: ¿Word o PDF? y luego enviar todo.
    
    abrirOpcionesDescarga(datosParaEnviar, colegioId);
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


