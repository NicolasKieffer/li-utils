<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  
  <!-- This stylesheet illustrates how to add custom user TEI attributes 
     in the TEI output of the keyterm extraction tool -->
  
  <!-- Enrich the default XML TEI standoff output of the keyterm extraction tool
       with ISTEX attributes and usage information -->

  <!-- the style sheet takes two external variables, the documentId 
     (here the ISTEX document identifier) and the run identifier -->
  <xsl:param name="documentId" select="'unknown'"/>
  <xsl:param name="runId" select="'keyterm-run1'"/>

  <xsl:output method="xml" encoding="utf-8" indent="yes"/>
  
  <!-- good old identity template -->   
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" />
    </xsl:copy>
  </xsl:template>
  
  <!-- good old cleaning template for the output -->
  <xsl:template match="text()">
    <xsl:value-of select="normalize-space()" />
  </xsl:template>
  
  <xsl:variable name="date-run" select="/standOff/teiHeader/fileDesc/encodingDesc/appInfo/application/@when" /> 
  
  <!-- special additions for ISTEX user -->
  <!-- you can edit bellow to replace ISTEX information by your own user values -->
  <xsl:template match="respStmt">
    <respStmt xml:id="istex-rd">
          <resp>enrichissement indexation ISTEX-RD</resp>
          <name>ISTEX-RD</name>
      </respStmt>
  </xsl:template>
  
  <xsl:template match="availability">
      <availability status="restricted">
          <licence target="http://creativecommons.org/licenses/by/4.0/">
              <p>L’élément standOff de ce document est distribué sous licence Creative Commons 4.0 non transposée (CC BY 4.0)</p>
              <p>Ce standOff a été créé dans le cadre du projet ISTEX – Initiative d’Excellence en Information Scientifique et Technique</p>
          </licence>
      </availability>
  </xsl:template>
  
  <xsl:template match="revisionDesc">
    <revisionDesc>
      <change who="#istex-rd">
        <!-- add the date/time located in the application run information -->
        <xsl:attribute name="xml:id">
          <xsl:value-of select="$runId"/>
        </xsl:attribute>
        <xsl:attribute name="when">
          <xsl:value-of select="$date-run"/>
        </xsl:attribute>
        <xsl:text>Indexation de documents ISTEX</xsl:text>
      </change>
      
    </revisionDesc>
  </xsl:template>
  
  <xsl:template match="keywords">
    <xsl:copy>
      <xsl:attribute name="resp">#istex-rd</xsl:attribute>
      <xsl:attribute name="change">#<xsl:value-of select="$runId"/></xsl:attribute>
      <xsl:apply-templates select="@*|node()" />
    </xsl:copy> 
  </xsl:template> 

  <!-- Finally injecting the document identifier as external variable -->
  <xsl:template match="sourceDesc">
    <sourceDesc>
      <biblStruct>
        <idno type="ISTEX"><xsl:value-of select="$documentId"/>
        </idno>
      </biblStruct>
    </sourceDesc>
  </xsl:template>
  
  <xsl:template match="@inst">
     <xsl:attribute name="corresp">
        <xsl:value-of select="."/>
     </xsl:attribute>
  </xsl:template>


</xsl:stylesheet>