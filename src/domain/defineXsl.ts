// A stylesheet written for this trainer (not the CDISC one), so define.xml opens in a browser
// as readable tables: datasets, variables with origins linked to acrf.pdf pages, value-level
// metadata, codelists, methods and comments, all cross-linked. Browsers apply it when the file
// is served (or opened in Firefox); Chrome does not run XSL from local files.
export const DEFINE_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:odm="http://www.cdisc.org/ns/odm/v1.3" xmlns:def="http://www.cdisc.org/ns/def/v2.1" xmlns:xlink="http://www.w3.org/1999/xlink" exclude-result-prefixes="odm def xlink">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:variable name="mdv" select="/odm:ODM/odm:Study/odm:MetaDataVersion"/>
<xsl:template match="/">
<html><head><title><xsl:value-of select="/odm:ODM/odm:Study/odm:GlobalVariables/odm:StudyName"/> define.xml</title>
<style>body{font:13px/1.45 Arial,Helvetica,sans-serif;margin:24px;color:#111}h1{font-size:20px}h2{font-size:16px;margin-top:28px;border-bottom:1px solid #999}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #bbb;padding:3px 6px;vertical-align:top;text-align:left}th{background:#e8eef7}a{color:#1d4ed8}.k{font-family:monospace}.n{color:#555;font-size:12px}</style></head><body>
<h1>Define-XML 2.1 · <xsl:value-of select="/odm:ODM/odm:Study/odm:GlobalVariables/odm:StudyName"/></h1>
<p class="n"><xsl:value-of select="/odm:ODM/odm:Study/odm:GlobalVariables/odm:StudyDescription"/></p>
<p class="n">Created <xsl:value-of select="/odm:ODM/@CreationDateTime"/> · <xsl:value-of select="/odm:ODM/@Originator"/></p>
<h2>Standards</h2><table><tr><th>Name</th><th>Type</th><th>Version</th><th>Status</th></tr>
<xsl:for-each select="$mdv/def:Standards/def:Standard"><tr><td><xsl:value-of select="@Name"/></td><td><xsl:value-of select="@Type"/> <xsl:value-of select="@PublishingSet"/></td><td><xsl:value-of select="@Version"/></td><td><xsl:value-of select="@Status"/></td></tr></xsl:for-each></table>
<p>Documents: <xsl:for-each select="$mdv/def:leaf"><a href="{@xlink:href}"><xsl:value-of select="def:title"/></a><xsl:text>  </xsl:text></xsl:for-each></p>
<h2>Datasets</h2><table><tr><th>Dataset</th><th>Description</th><th>Class</th><th>Structure</th><th>Keys</th><th>Location</th></tr>
<xsl:for-each select="$mdv/odm:ItemGroupDef"><tr><td class="k"><a href="#{@OID}"><xsl:value-of select="@Name"/></a></td><td><xsl:value-of select="odm:Description/odm:TranslatedText"/></td><td><xsl:value-of select="def:Class/@Name"/></td><td><xsl:value-of select="@def:Structure"/></td><td class="k"><xsl:for-each select="odm:ItemRef[@KeySequence]"><xsl:sort select="@KeySequence" data-type="number"/><xsl:variable name="o" select="@ItemOID"/><xsl:value-of select="$mdv/odm:ItemDef[@OID=$o]/@Name"/><xsl:text> </xsl:text></xsl:for-each></td><td><a href="{def:leaf/@xlink:href}"><xsl:value-of select="def:leaf/def:title"/></a></td></tr></xsl:for-each></table>
<xsl:for-each select="$mdv/odm:ItemGroupDef">
<h2 id="{@OID}"><xsl:value-of select="@Name"/> · <xsl:value-of select="odm:Description/odm:TranslatedText"/></h2>
<xsl:if test="@def:CommentOID"><xsl:variable name="c" select="@def:CommentOID"/><p class="n"><xsl:value-of select="$mdv/def:CommentDef[@OID=$c]/odm:Description/odm:TranslatedText"/></p></xsl:if>
<table><tr><th>Variable</th><th>Label</th><th>Key</th><th>Type</th><th>Length</th><th>Role</th><th>Controlled terms</th><th>Origin</th><th>Derivation / comment</th></tr>
<xsl:for-each select="odm:ItemRef"><xsl:variable name="o" select="@ItemOID"/><xsl:variable name="it" select="$mdv/odm:ItemDef[@OID=$o]"/><xsl:variable name="m" select="@MethodOID"/>
<tr><td class="k"><xsl:value-of select="$it/@Name"/><xsl:if test="$it/def:ValueListRef"> <a href="#{$it/def:ValueListRef/@ValueListOID}">(values)</a></xsl:if></td><td><xsl:value-of select="$it/odm:Description/odm:TranslatedText"/></td><td><xsl:value-of select="@KeySequence"/></td><td><xsl:value-of select="$it/@DataType"/></td><td><xsl:value-of select="$it/@Length"/></td><td><xsl:value-of select="@Role"/></td>
<td><xsl:if test="$it/odm:CodeListRef"><xsl:variable name="cl" select="$it/odm:CodeListRef/@CodeListOID"/><a href="#{$cl}"><xsl:value-of select="$mdv/odm:CodeList[@OID=$cl]/@Name"/></a></xsl:if></td>
<td><xsl:value-of select="$it/def:Origin/@Type"/><xsl:if test="$it/def:Origin/@Source"> (<xsl:value-of select="$it/def:Origin/@Source"/>)</xsl:if><xsl:for-each select="$it/def:Origin/def:DocumentRef/def:PDFPageRef"> · aCRF <xsl:call-template name="pages"><xsl:with-param name="s" select="normalize-space(@PageRefs)"/></xsl:call-template></xsl:for-each></td>
<td><xsl:value-of select="$mdv/odm:MethodDef[@OID=$m]/odm:Description/odm:TranslatedText"/><xsl:value-of select="$it/def:Origin/odm:Description/odm:TranslatedText"/></td></tr></xsl:for-each></table></xsl:for-each>
<xsl:if test="$mdv/def:ValueListDef"><h2>Value-level metadata</h2>
<xsl:for-each select="$mdv/def:ValueListDef"><h3 id="{@OID}" class="k"><xsl:value-of select="@OID"/></h3><table><tr><th>Where</th><th>Type</th><th>Length</th><th>Origin</th></tr>
<xsl:for-each select="odm:ItemRef"><xsl:variable name="o" select="@ItemOID"/><xsl:variable name="it" select="$mdv/odm:ItemDef[@OID=$o]"/><xsl:variable name="w" select="def:WhereClauseRef/@WhereClauseOID"/><xsl:variable name="wc" select="$mdv/def:WhereClauseDef[@OID=$w]/odm:RangeCheck"/><xsl:variable name="wi" select="$wc/@def:ItemOID"/>
<tr><td class="k"><xsl:value-of select="$mdv/odm:ItemDef[@OID=$wi]/@Name"/> = <xsl:value-of select="$wc/odm:CheckValue"/></td><td><xsl:value-of select="$it/@DataType"/></td><td><xsl:value-of select="$it/@Length"/></td><td><xsl:value-of select="$it/def:Origin/@Type"/><xsl:for-each select="$it/def:Origin/def:DocumentRef/def:PDFPageRef"> · aCRF <xsl:call-template name="pages"><xsl:with-param name="s" select="normalize-space(@PageRefs)"/></xsl:call-template></xsl:for-each></td></tr></xsl:for-each></table></xsl:for-each></xsl:if>
<h2>Codelists</h2><xsl:for-each select="$mdv/odm:CodeList"><h3 id="{@OID}"><xsl:value-of select="@Name"/></h3><table><tr><th>Coded value</th><th>Decode</th></tr>
<xsl:for-each select="odm:CodeListItem|odm:EnumeratedItem"><tr><td class="k"><xsl:value-of select="@CodedValue"/><xsl:if test="@def:ExtendedValue='Yes'"> *</xsl:if></td><td><xsl:value-of select="odm:Decode/odm:TranslatedText"/></td></tr></xsl:for-each></table></xsl:for-each>
<p class="n">* Extended value (added by the sponsor to an extensible codelist).</p>
</body></html>
</xsl:template>
<xsl:template name="pages"><xsl:param name="s"/><xsl:choose><xsl:when test="contains($s,' ')"><a href="acrf.pdf#page={substring-before($s,' ')}"><xsl:value-of select="substring-before($s,' ')"/></a><xsl:text> </xsl:text><xsl:call-template name="pages"><xsl:with-param name="s" select="substring-after($s,' ')"/></xsl:call-template></xsl:when><xsl:otherwise><a href="acrf.pdf#page={$s}"><xsl:value-of select="$s"/></a></xsl:otherwise></xsl:choose></xsl:template>
</xsl:stylesheet>
`
