const { google } = require('googleapis');
const { Client } = require('pg');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const client = new Client({
    connectionString: 'postgres://wfkxgicnkataws:d193871d236ce92502364c883d19d7eeec56a9cde61081d9f9d188b15191ae7b@ec2-46-137-84-140.eu-west-1.compute.amazonaws.com:5432/d65sahdom226p1'
    , ssl: true
});

client.connect();

const getUsers = (request, response, html_code) => {
    client.query('SELECT id, name, counter, to_char(joined, \'YYYY-MM-DD HH:mm:ss\') as joined, to_char(lastvisit, \'YYYY-MM-DD HH:mm:ss\') as lastvisit FROM public.users;', (err, res) => {
        if (err) throw err;
        console.log('Dostałem...');
        response.send(json2table(res.rows, '', html_code));
    });
};

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function json2table(json, classes, html_code) {
    var cols = Object.keys(json[0]);
    var headerRow = '';
    var bodyRows = '';
    classes = classes || '';

    cols.map(function(col) {
        headerRow += '<th scope="col">' + capitalizeFirstLetter(col) + '</th>';
    });

    json.map(function(row) {
        bodyRows += '<tr>';
        cols.map(function(colName) {
            bodyRows += '<td>' + row[colName] + '</td>';
        });
        bodyRows += '</tr>';
    });

    return html_begin + navbar_begin + html_code + navbar_end + '<br><br><table border="1" class="table ' + classes + '"><thead><tr>' + headerRow + '</tr></thead><tbody>' + bodyRows + '</tbody></table>' + html_end;
}

function updateTable(user) {

    var query = "SELECT id FROM public.users WHERE name = '" + user + "';";
    console.log(query);

    client.query(query, (err, res) => {
        console.log(err, res.rows.length);

        if (res.rows.length > 0) {
            var query = "UPDATE public.users SET lastvisit=now(), counter = counter + 1 WHERE name ='" + user + "';";
            console.log(query);

            client.query(query, (err, res) => {
                console.log(err, res);
                console.log('Update wykonany do bazy');
            });
        } else {
            var query = "INSERT INTO public.users (name, counter, joined, lastvisit) VALUES ('" + user + "', 1, now(), now())";
            console.log(query);

            client.query(query, (err, res) => {
                console.log(err, res);
                console.log('Dodano użytkownika do bazy');
            });
        }
    });
}

const express = require('express');
const OAuth2Data = require('./google_key.json');

const app = express();

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
var authed = false;

app.get('/', (req, res) => {
    if (!authed) {
        res.sendFile(__dirname + "/index.html");
    } else {
        var ouath2 = google.oauth2({auth: oAuth2Client, version: 'v2'});
        ouath2.userinfo.v2.me.get(function (err, result) {
            if (err) {
                console.log("Niestety BLAd!!");
                console.log(err);
            } else {
                loggedUser = result.data.name;
                console.log(loggedUser);
            }
            updateTable(loggedUser);
            getUsers(req, res, 'Logged in '.concat(loggedUser, '  <img src="', result.data.picture, '"height="23" width="23">'))
        });
    }
});

app.get('/log', (req, res) => {
    if (!authed) {
        // Generate an OAuth URL and redirect there
        const url = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/userinfo.profile'
        });
        console.log(url);
        res.redirect(url);
    } else {
        var ouath2 = google.oauth2({auth: oAuth2Client, version: 'v2'});
        ouath2.userinfo.v2.me.get(function (err, result) {
            if (err) {
                console.log("Niestety BLAd!!");
                console.log(err);
            } else {
                loggedUser = result.data.name;
                console.log(loggedUser);
            }
            res.send('Logged in '.concat(loggedUser, '<img src="', result.data.picture,
                '"height="23" width="23">', '<br', '><br', '><form action="/logout"', '><input type="submit" value="Wyloguj"', '></form', '>'));

        });
    }
});

app.get('/logout', (req, res) => {
    if (!authed) {
        res.sendFile(__dirname + "/index.html");
    } else {
        var auth2 = gapi.auth2.getAuthInstance();
        auth2.signOut();
        auth2.disconnect();
        res.sendFile(__dirname + "/index.html");
    }
});

app.get('/auth/google/callback', function (req, res) {
    const code = req.query.code;
    if (code) {
        // Get an access token based on our OAuth code
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating');
                console.log(err);
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                authed = true;
                res.redirect('/');
            }
        });
    }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running at ${port}`));

navbar_begin = `<nav class="navbar navbar-dark bg-dark"><span class="navbar-brand mb-0 h1">`;
navbar_end = `</span></nav>`;

html_begin = `<!DOCTYPE html>
<html lang="en">
    <head>
    <title>Bootstrap Example</title>
<meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js"></script>
    </head>
    <body>

    <div class="jumbotron text-center">
    <h1><h1>Przykładowa strona na PKI</h1></h1>
<p>Uruchomiona na Heroku!</p>
</div>

<div class="container">
    <center>
    <div class="row">
`;

html_end = `</div>
    </center>
</div>

</body>
</html>
`;