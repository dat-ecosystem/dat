# I forgot my dat password

## Heroku

If you used [heroku-dat-template](http://github.com/bmpvieira/heroku-dat-template), you entered it here:

![password-enter](https://raw.githubusercontent.com/bmpvieira/heroku-dat-template/master/screens/password-enter.png)

Do you remember it? If not, you can get access to your heroku password like this:

  ```
  $ heroku login
  $ heroku config --app mydat
  DAT_ADMIN_USER='admin'
  DAT_ADMIN_PASS='iamapassword'
  ```

## Linux/Mac

Your dat username and password is set using environment variables.

That is, on the machine, there should be two bash variables available: `DAT_ADMIN_USER` and `DAT_ADMIN_PASS`.

You can set them in your environment like this:
```bash
export DAT_ADMIN_USER='username'
export DAT_ADMIN_PASS='password'
```

You can check to see what they are like this:

```bash
$ echo $DAT_ADMIN_USER
username
$ echo $DAT_ADMIN_PASS
password
```