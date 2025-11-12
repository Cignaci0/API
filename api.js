import {getconeccion, mssql} from "./conexion.js"
import express from "express";
import bodyParser from "body-parser"
import cors from "cors";
const app = express();
import axios from "axios" // es un cliente HTTP para hacer peticiones
app.use(bodyParser.json()) //transforma automaticamente de json a objeto
app.use(cors()); //se usa para aceptar peticiones externas ( como andorid estudio )
const conexion = await getconeccion()
const PUERTO = process.env.PORT || 3000; // es la variable de entorno para conectarse a render
                                        // y si no la encuentra se conecta al puerto 3000

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001/predict"; // es la variable para hacer la conexion
                                                                                      // con el ML en HUGGING y si no la encuentra usa 
                                                                                      // el puerto "http://127.0.0.1:5001/predict"

// inicia el servidor
app.listen(PUERTO, () => {
    console.log(`El servidor esta escuchando en el puerto: ${PUERTO}`)
});


// Validar inicio de sesión de usuario
app.post("/inicioSesion", async (req, res) => {
    try {
        const { rut, contrasena } = req.body;
        if (!rut || !contrasena) {
            return res.status(400).json({ 
                exito: false, 
                mensaje: "Faltan el RUT o la contraseña" 
            });
        }
        const resultado = await conexion
            .request()
            .input("RUT_Usuario", mssql.VarChar, rut)
            .input("Contrasena_Usuario", mssql.VarChar, contrasena)
            .query("SELECT * FROM USUARIOS WHERE RUT = @RUT_Usuario AND Contraseña = @Contrasena_Usuario");
        if (resultado.recordset.length > 0) {
            const usuario = resultado.recordset[0];
            res.status(200).json({
                exito: true,
                mensaje: "Inicio de sesión exitoso",
                id_usuario: usuario.ID_Usuario
            });
        } else {
            res.status(401).json({
                exito: false,
                mensaje: "Credenciales incorrectas"
            });
        }
    } catch (error) {
        console.error("Error en el inicio de sesión:", error);
        res.status(500).json({ 
            exito: false, 
            mensaje: "Error interno del servidor" 
        });
    }
});


// Obtener Filtros por id de usuario
app.get("/usuarios/:id/filtros",async(req,res)=>{
    try{
        const{id} = req.params
        if(!id){
            return res.status(400).json({error: "Falta el ID del usuario"})
        }
        const resultado = await conexion
            .request()
            .input("ID_Usuario", mssql.Int, id)
            .query("SELECT * FROM FILTROS WHERE ID_Usuario = @ID_Usuario")
        if(resultado.recordset.length > 0){
            console.log(resultado.recordset)
            res.json(resultado.recordset)
        }else{
            res.json([])
        }
    }catch (error){
        console.error("Error al obetenr filtros:", error);
        res.status(500).json({error: "Error al obtener los filtros"})
    }
});

// Obtener prediccion
app.get("/filtros/:id/predecir", async (req,res)=>{
    try {
        const {id} = req.params
        console.log(`petecion de predicion para filtro: ${id}`)
        const resultado = await conexion
            .request()
            .input("ID_Filtro", mssql.Int, id)
            .query("select top 1 Valor_pH, Valor_TDS from LECTURAS where ID_Filtro = @ID_Filtro order by Fecha DESC")
        if (resultado.recordset.length === 0) {
            return res.status(404).json({ error: "No se encontraron lecturas para este filtro." });
        }
        const ultimaLectura = resultado.recordset[0];
        const ph = ultimaLectura.Valor_pH;
        const tds = ultimaLectura.Valor_TDS;

        console.log(`Última lectura encontrada: pH=${ph}, TDS=${tds}`);

        // Llamar al servicio de Python (ML)
        const respuestaML = await axios.post(ML_SERVICE_URL,
            {
                ph: ph,
                tds: tds
            },
            
            { 
            timeout: 90000  // tiene hasta 90 segundos para que el servidor responda
            }
        );

        // Devolver la predicción al usuario
        res.status(200).json({
            filtro_id: id,
            ultimo_ph_registrado: ph,
            ultimo_tds_registrado: tds,
            dias_restantes_aprox: respuestaML.data.dias_restantes
        });

    }catch(error){
        console.error("Error en el endpoint de predicción:", error.message)
        res.status(500).json({error: "Error al obtener preddicion"})
    }
});

    //Obtener las lecturas por cada filtro (para graficos)
app.get("/filtros/:id/lecturas",async(req,res)=>{
    try{
        const{id} = req.params
        if(!id){
            return res.status(400).json({error: "Falta el ID de lectura"})
        }
        const resultado = await conexion
            .request()
            .input("ID_Filtro", mssql.Int, id)
            .query("SELECT * FROM LECTURAS WHERE ID_Filtro = @ID_Filtro")
        if(resultado.recordset.length > 0){
            res.json(resultado.recordset)
        }else{
            res.json([])
        }
    }catch(error){
        console.error("Error al obetenr lectura:", error);
        res.status(500).json({error: "Error al obtener lectura"})
    }
})


// obtener datos del emulador de datos
app.post("/captura", async (req, res) => {
     try {
            const { device_id, fecha, ph, tds, flujo } = req.body;
            if (!device_id || !ph || !fecha|| !tds || !flujo) 
                {console.error("Faltan datos en la solicitud de captura.");
                return res.status(400).json({ error: "Faltan uno o más campos (id, ph, tds, flujo)" });}
            const resultado = await conexion
                .request()
                .input("Fecha", mssql.DateTime, fecha)
                .input("ID_Filtro", mssql.Int, device_id)
                .input("Valor_pH", mssql.Float, parseFloat(ph))
                .input("Valor_TDS", mssql.Int, parseInt(tds, 10))
                .input("Valor_Flujo", mssql.Float, parseFloat(flujo))
                .query("INSERT INTO LECTURAS (ID_Filtro, Fecha, Valor_pH, Valor_TDS, Valor_Flujo) VALUES (@ID_Filtro, @Fecha, @Valor_pH, @Valor_TDS, @Valor_Flujo)");
            console.log("Lectura recivida y agregada");
            res.status(200).json({ mensaje: "Datos recibidos correctamente" });
            if (resultado.recordset > 0){
                console.log(resultado.recordset)
            }
    } catch (error) {
        console.error("Error al guardar la lectura:", error);
        res.status(500).json({ error: "Error interno del servidor al procesar la lectura." });
   }
})


