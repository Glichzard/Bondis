const OAuth = require('oauth')
const request = require('request')
const cors = require('cors')
const express = require('express')
const app = express()
const dotenv = require("dotenv")

dotenv.config()

app.use(cors())

const clienteId = process.env.CLIENT_ID
const clienteSecreto = process.env.CLIENT_SECRET
const tokenUrl = 'https://mvdapi-auth.montevideo.gub.uy/auth/realms/pci/protocol/openid-connect/token'

let access_token = ""

const oauth2 = new OAuth.OAuth2(
    clienteId,
    clienteSecreto,
    '',
    '',
    tokenUrl,
    null
)

const getToken = async () => {
    const { access_token } = await new Promise((resolve, reject) => {
        oauth2.getOAuthAccessToken(
            '',
            { 'grant_type': 'client_credentials' },
            (e, access_token, refresh_token, results) => {
                if (e) reject(e)
                else resolve({ access_token })
            })
    })

    return access_token
}

const handleResultRequest = (url) => {
    return new Promise((resolve, reject) => {
        request.get({
            url,
            headers: {
                Authorization: 'Bearer ' + access_token
            }
        }, async function (error, response, body) {
            if (body === "Usage limit exceeded" || body === "Authentication failed") {
                setTimeout(async () => {
                    const newToken = await getToken()
                    access_token = newToken
                    const result = await handleResultRequest(url)
                    resolve(result)
                }, 10000)
            } else {
                try {
                    const parsedBody = JSON.parse(body)
                    resolve(parsedBody)
                } catch (jsonError) {
                    const result = await handleResultRequest(url)
                    resolve(result)
                }
            }
        })
    })
}
  

app.get('/busstops', async (req, res) => {
    res.json(await handleResultRequest("https://api.montevideo.gub.uy/api/transportepublico/buses/busstops"))
})

app.get('/busstops/:busstopid/lines', async (req, res) => {
    const { busstopid } = req.params
    res.json(await handleResultRequest(`https://api.montevideo.gub.uy/api/transportepublico/buses/busstops/${busstopid}/lines`))
})

app.get('/buses/:busstopid/', async (req, res) => {
    const { busstopid } = req.params
    res.json(await handleResultRequest(`https://api.montevideo.gub.uy/api/transportepublico/buses?busstopId=${busstopid}`))
})

app.get('/buses/:busstopid/:line', async (req, res) => {
    const { busstopid } = req.params
    const { line } = req.params

    const result = await handleResultRequest(`https://api.montevideo.gub.uy/api/transportepublico/buses?busstopId=${busstopid}`)
    const selectedline = result.filter(linea => linea.line === line)
    res.json(selectedline)
})

app.listen(3000, () => {
    getToken().then(token => {
        access_token = token
    })
})


// app.get('/busstops/:busstopid/lines', async (req, res) => {
//     const { busstopid } = req.params

//     request.get({
//         url: `https://api.montevideo.gub.uy/api/transportepublico/buses/busstops/${busstopid}/lines`,
//         headers: {
//             'Authorization': 'Bearer ' + access_token
//         }
//     }, (error, response, body) => {
//         res.json(body)
//     })
// })

// app.get('/buses/:busstopid/:line', async (req, res) => {
//     console.log("me llamaron 2")
//     const { busstopid } = req.params
//     const { line } = req.params

//     request.get({
//         url: `https://api.montevideo.gub.uy/api/transportepublico/buses?busstopId=${busstopid}`,
//         headers: {
//             'Authorization': 'Bearer ' + access_token
//         }
//     }, function (error, response, body) {
//         body = JSON.parse(body)
//         let selectedline = body.filter(linea => linea.line == line)
//         res.json(selectedline)
//     })
// })

















// app.get('/busstops', async (req, res) => {
//     console.log(access_token)
//     const access_token = await getToken()

//     request.get({
//         url: 'https://api.montevideo.gub.uy/api/transportepublico/buses/busstops',
//         headers: {
//             'Authorization': 'Bearer ' + access_token
//         }
//     }, function (error, response, body) {
//         res.json(body)
//     })
// })

// app.get('/busstops/:busstopid/lines', async (req, res) => {
//     console.log(access_token)
//     // const access_token = await getToken()
    
//     const { busstopid } = req.params
    
//     request.get({
//         url: `https://api.montevideo.gub.uy/api/transportepublico/buses/busstops/${busstopid}/lines`,
//         headers: {
//             'Authorization': 'Bearer ' + access_token
//         }
//     }, function (error, response, body) {
//         res.json(body)
//     })
// })

// app.get('/buses/:busstopid/:line', async (req, res) => {
//     console.log(access_token)
//     const access_token = await getToken()

//     const { busstopid } = req.params
//     const { line } = req.params

//     request.get({
//         url: `https://api.montevideo.gub.uy/api/transportepublico/buses?busstopId=${busstopid}`,
//         headers: {
//             'Authorization': 'Bearer ' + access_token
//         }
//     }, function (error, response, body) {
//         body = JSON.parse(body)
//         let selectedline = body.filter(linea => linea.line == line)
//         res.json(selectedline)
//     })
// })




// // request.get({
// //     url: apiUrl,
// //     headers: {
// //         'Authorization': 'Bearer ' + access_token
// //     }
// // }, function (error, response, body) {
// //     return "caca"
// // })