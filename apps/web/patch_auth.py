import re

def patch(filename):
    with open(filename, 'r') as f:
        content = f.read()

    if 'import { useAuth } from "@/lib/auth";' not in content:
        content = content.replace(
            'import {',
            'import { useAuth } from "@/lib/auth";\nimport {',
            1
        )
    
    # data-ingestion
    if 'DataIngestionWorkspace' in content:
        content = re.sub(
            r'(export function DataIngestionWorkspace\(\) {)',
            r'\1\n  const { hasPermission } = useAuth();\n  const canIngest = hasPermission("ingestion.create");',
            content
        )
        content = content.replace(
            'onClick={startUpload}',
            'onClick={startUpload} disabled={!canIngest} title={!canIngest ? "Permission denied" : ""}'
        )

    # match-review
    if 'MatchReviewWorkspace' in content:
        content = re.sub(
            r'(export function MatchReviewWorkspace.*?{)',
            r'\1\n  const { hasPermission } = useAuth();\n  const canVerify = hasPermission("match.verify");',
            content,
            flags=re.DOTALL
        )
        content = content.replace(
            'onClick={() => handleAccept(currentItem)}',
            'onClick={() => handleAccept(currentItem)} disabled={!canVerify}'
        )
        content = content.replace(
            'onClick={() => handleReject(currentItem)}',
            'onClick={() => handleReject(currentItem)} disabled={!canVerify}'
        )

    with open(filename, 'w') as f:
        f.write(content)

patch("src/components/data-ingestion.tsx")
patch("src/components/match-review.tsx")
