package main

import (
	"fmt"
	"html/template"
	"github.com/gorilla/mux"
	"github.com/gorilla/securecookie"
	"net/http"
  "os"

	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/amazon"
)

// cookie handling

var cookieHandler = securecookie.New(
	securecookie.GenerateRandomKey(64),
	securecookie.GenerateRandomKey(32))

func getUserName(request *http.Request) (userName string) {
	if cookie, err := request.Cookie("session"); err == nil {
		cookieValue := make(map[string]string)
		if err = cookieHandler.Decode("session", cookie.Value, &cookieValue); err == nil {
			userName = cookieValue["name"]
		}
	}
	return userName
}

func setSession(userName string, response http.ResponseWriter) {
	value := map[string]string{
		"name": userName,
	}
	if encoded, err := cookieHandler.Encode("session", value); err == nil {
		cookie := &http.Cookie{
			Name:  "session",
			Value: encoded,
			Path:  "/",
		}
		http.SetCookie(response, cookie)
	}
}

func clearSession(response http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:   "session",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	}
	http.SetCookie(response, cookie)
}

// login handler

func loginHandler(response http.ResponseWriter, request *http.Request) {
	name := request.FormValue("name")
	pass := request.FormValue("password")
	redirectTarget := "/"
	if name != "" && pass != "" {
		// .. check credentials ..
		setSession(name, response)
		redirectTarget = "/internal"
	}
	http.Redirect(response, request, redirectTarget, 302)
}

// logout handler

func logoutHandler(response http.ResponseWriter, request *http.Request) {
	clearSession(response)
	http.Redirect(response, request, "/", 302)
}

// index page

const indexPage = `
<h1>Login</h1>
<form method="post" action="/login">
    <label for="name">User name</label>
    <input type="text" id="name" name="name">
    <label for="password">Password</label>
    <input type="password" id="password" name="password">
    <button type="submit">Login</button>
</form>
`

func indexPageHandler(response http.ResponseWriter, request *http.Request) {
		//t, _ := template.New("foo").Parse(indexTemplate)
		//t.Execute(response, nil)
    //fmt.Fprintf(response, indexPage)
    http.ServeFile(response, request, "/home/stephen/ecloud/pynn/app/splash.html");
}

// internal page

const internalPage = `
<h1>Internal</h1>
<hr>
<small>User: %s</small>
<form method="post" action="/logout">
    <button type="submit">Logout</button>
</form>
`

func internalPageHandler(response http.ResponseWriter, request *http.Request) {
	userName := getUserName(request)
	if userName != "" {
		fmt.Fprintf(response, internalPage, userName)
	} else {
		http.Redirect(response, request, "/", 302)
	}
}

func callbackPageHandler(res http.ResponseWriter, req *http.Request) {

		// print our state string to the console
		fmt.Println("State: " + gothic.GetState(req))

		user, err := gothic.CompleteUserAuth(res, req)
		if err != nil {
			fmt.Fprintln(res, err)
			return
		}
		t, _ := template.New("foo").Parse(userTemplate)
		t.Execute(res, user)
	}

func startAuthHandler(res http.ResponseWriter, req *http.Request) {
		fmt.Println("Start Auth Handler: " + gothic.GetState(req));
    gothic.BeginAuthHandler(res,req);
	}

// static files handling
func ServeStatic(router *mux.Router, staticDirectory string) {
    staticPaths := map[string]string {
        "app":                 staticDirectory + "/app/",
        "elements":            staticDirectory + "/app/elements/",
        "styles":              staticDirectory + "/app/styles/",
        "images":              staticDirectory + "/app/images/",
        "scripts":             staticDirectory + "/app/scripts/",
        "bower_components":    staticDirectory + "/app/bower_components/",
    }

    for pathName, pathValue := range staticPaths {
        pathPrefix := "/" + pathName + "/"
        router.PathPrefix(pathPrefix).Handler(http.StripPrefix(pathPrefix, http.FileServer(http.Dir(pathValue))))
    }
}

func ServeBower(router *mux.Router, staticDirectory string) {
    staticPaths := map[string]string {
        "bower_components":    staticDirectory + "/bower_components/",
    }

    for pathName, pathValue := range staticPaths {
        pathPrefix := "/" + pathName + "/"
        router.PathPrefix(pathPrefix).Handler(http.StripPrefix(pathPrefix, http.FileServer(http.Dir(pathValue))))
    }
}

// server main method

var router = mux.NewRouter()

func main() {

  gothic.GetProviderName = func(req *http.Request) (string, error) {
                                                                      return "amazon", nil
                           }

	goth.UseProviders(
    amazon.New(os.Getenv("AMAZON_KEY"), os.Getenv("AMAZON_SECRET"), "https://ecloud.nimbostrati.com:9898/auth/amazon/callback", "profile"),
	)
	
  router.HandleFunc("/", indexPageHandler)
	router.HandleFunc("/auth/amazon/callback", callbackPageHandler)
	//router.HandleFunc("/auth/amazon", gothic.BeginAuthHandler)
	router.HandleFunc("/auth/amazon", startAuthHandler)

	//router.HandleFunc("/internal", internalPageHandler)

	//router.HandleFunc("/login", loginHandler).Methods("POST")
	//router.HandleFunc("/logout", logoutHandler).Methods("POST")

  //router.PathPrefix("/images/").Handler(http.StripPrefix("/images/", http.FileServer(http.Dir("/home/stephen/ecloud/entrypoint/app/images/"))))

  ServeStatic(router, "/home/stephen/ecloud/pynn/")
//  ServeBower(router, "/home/stephen/ecloud/entrypoint/")

	http.Handle("/", router)
	//http.ListenAndServe(":8000", nil)
  fmt.Println("About to listen and serve.")
  http.ListenAndServeTLS(":9898", os.Getenv("GOTH_SSL_CERT"), os.Getenv("GOTH_SSL_KEY"), nil) 
}


var indexTemplate = `
<p><a href="/auth/amazon">Log in with Amazon</a></p>
`

var userTemplate = `
<p>Name: {{.Name}}</p>
<p>Email: {{.Email}}</p>
<p>NickName: {{.NickName}}</p>
<p>Location: {{.Location}}</p>
<p>AvatarURL: {{.AvatarURL}} <img src="{{.AvatarURL}}"></p>
<p>Description: {{.Description}}</p>
<p>UserID: {{.UserID}}</p>
<p>AccessToken: {{.AccessToken}}</p>
`
