# Configuration

md2cf stores credentials in `~/.md2cf/config.json`.

## Interactive setup

The easiest way to configure md2cf is the interactive prompt:

```bash
md2cf config
```

This asks for your **email**, **API token**, and **Confluence base URL**, then writes them to disk.

## Manual set / get

```bash
md2cf config set email user@company.com
md2cf config set token YOUR_API_TOKEN
md2cf config set baseUrl https://company.atlassian.net
```

Retrieve a single value:

```bash
md2cf config get email
```

## List current config

```bash
md2cf config list
```

The token is masked in the output for security.

## Reset config

Delete all stored configuration:

```bash
md2cf config reset
```

## Config file path

Show the path to the config file:

```bash
md2cf config path
```

Default location: `~/.md2cf/config.json`

## Config fields

| Field       | Required | Description                                                              |
| ----------- | -------- | ------------------------------------------------------------------------ |
| `email`     | Yes      | Atlassian account email                                                  |
| `token`     | Yes      | API token from [id.atlassian.com](https://id.atlassian.com/manage/api-tokens) |
| `baseUrl`   | Yes      | Confluence instance URL (e.g. `https://company.atlassian.net`)           |
