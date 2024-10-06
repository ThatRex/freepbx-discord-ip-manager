# FreePBX Discord IP Manager

_Tested on FreePBX 17_

> [!NOTE]
> This bot was created for FreePBX systems I help manage. It is not thoroughly tested, and the instructions assume you know what you are doing.

# Setup

1. Change directory to `/opt/`, then clone this repo.

    ```bash
    cd /opt/
    git clone https://github.com/ThatRex/freepbx-discord-ip-manager
    ```

2. Change directory to `freepbx-discord-ip-manager`, then setup the bot.

    ```bash
    cd freepbx-discord-ip-manager/
    npm install
    npm run build
    npm run db:migration:run
    ```

3. Create a service file.
    ```
    nano /etc/systemd/system/ipman-bot.service
    ```
4. Copy the following contents into the service file replacing `REPLACE_WITH_TOKEN` with your bot token.

    ```bash
    [Unit]
    Description=freepbx-discord-ip-manager

    [Service]
    WorkingDirectory=/opt/freepbx-discord-ip-manager/
    ExecStart=/usr/bin/node build/main.js
    Restart=always
    User=root
    Environment="NODE_ENV=production"
    Environment="BOT_TOKEN=REPLACE_WITH_TOKEN"
    Environment="IP_ABUSE_CONFIDENCE_SCORE_REJECTION_PERCENTAGE=50"
    Environment="BLACKLIST_CSV=/etc/asterisk/_blacklist_outbound.csv"
    Environment="IP_TRUST_TIMEOUT_HOURS=24"
    Environment="ABUSEIPDB_KEY="

    [Install]
    WantedBy=multi-user.target
    ```

5. Run the following command then you can [manage the bot service.](#managing-the-service)

    ```bash
    systemctl daemon-reload
    ```

# Managing The Service

```bash
# start and stop service
systemctl start ipman-bot
systemctl stop ipman-bot

# view status and logs
systemctl status ipman-bot
tail -n 20 -f /var/log/syslog # display last 20 lines and follow syslog

# enable and disable service (autostart)
systemctl enable ipman-bot
systemctl disable ipman-bot
```

# Using Number Blacklist

Place the following into `extensions_custom.conf
` under **Admin > Config Edit**.

```ini
[macro-dialout-trunk-predial-hook]
exten => s,1,NoOp()
 same => n,Gosub(check-blacklist,outbound,1(${DIAL_NUMBER}))
 same => n,Return()

[check-blacklist]
exten => outbound,1,NoOp(Checking Outbound Blacklist)
 same => n,Set(BLACKLISTED_NUM=${SHELL(grep ^${ARG1} "${ASTETCDIR}/_blacklist_outbound.csv" | tr -d "\r\n")})
 same => n,ExecIf($["${BLACKLISTED_NUM}"!=""]?Playback(privacy-this-number-is&privacy-blacklisted))
 same => n,ExecIf($["${BLACKLISTED_NUM}"!=""]?Hangup())
 same => n,Return()
```
# Bot Command Perms

By default, all commands are available to everyone. You can change this under **Server Settings > Integrations > Your Bot**.