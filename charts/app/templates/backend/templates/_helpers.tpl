{{/*
Expand the name of the chart.
*/}}
{{- define "backend.name" -}}
{{- printf "backend" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "backend.fullname" -}}
{{- $componentName := include "backend.name" .  }}
{{- if .Values.backend.fullnameOverride }}
{{- .Values.backend.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $componentName | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "backend.labels" -}}
{{ include "backend.selectorLabels" . }}
{{- if .Values.global.tag }}
app.kubernetes.io/image-version: {{ .Values.global.tag | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/short-name: {{ include "backend.name" . }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
DEMO_NOTIFY_GATEWAY_CLIENT_ID: explicit values override; else reuse existing Secret on upgrade (lookup);
else new uuidv4 on first install. Requires live cluster for stable IDs across `helm template` runs.
*/}}
{{- define "backend.demoNotifyGatewayClientId" -}}
{{- $cfg := .Values.backend.demoNotifyGateway }}
{{- $override := $cfg.gatewayClientId | default "" | trim }}
{{- if $override }}
{{- $override }}
{{- else }}
{{- $secretName := printf "%s-demo-notify-gateway-id" (include "backend.fullname" .) }}
{{- $existing := lookup "v1" "Secret" .Release.Namespace $secretName }}
{{- if and $existing $existing.data (hasKey $existing.data "DEMO_NOTIFY_GATEWAY_CLIENT_ID") }}
{{- index $existing.data "DEMO_NOTIFY_GATEWAY_CLIENT_ID" | b64dec }}
{{- else }}
{{- uuidv4 }}
{{- end }}
{{- end }}
{{- end }}


