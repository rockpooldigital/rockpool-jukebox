namespace SpotifyLauncher
{
  partial class frmMain
  {
    /// <summary>
    /// Required designer variable.
    /// </summary>
    private System.ComponentModel.IContainer components = null;

    /// <summary>
    /// Clean up any resources being used.
    /// </summary>
    /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
    protected override void Dispose(bool disposing)
    {
      if (disposing && (components != null))
      {
        components.Dispose();
      }
      base.Dispose(disposing);
    }

    #region Windows Form Designer generated code

    /// <summary>
    /// Required method for Designer support - do not modify
    /// the contents of this method with the code editor.
    /// </summary>
    private void InitializeComponent()
    {
      this.components = new System.ComponentModel.Container();
      this.lblPlaying = new System.Windows.Forms.Label();
      this.lblPosition = new System.Windows.Forms.Label();
      this.label1 = new System.Windows.Forms.Label();
      this.txtStreamID = new System.Windows.Forms.TextBox();
      this.cmdStart = new System.Windows.Forms.Button();
      this.tmrUpdateStatus = new System.Windows.Forms.Timer(this.components);
      this.txtServerUrl = new System.Windows.Forms.TextBox();
      this.label2 = new System.Windows.Forms.Label();
      this.SuspendLayout();
      // 
      // lblPlaying
      // 
      this.lblPlaying.AutoSize = true;
      this.lblPlaying.Location = new System.Drawing.Point(12, 129);
      this.lblPlaying.Name = "lblPlaying";
      this.lblPlaying.Size = new System.Drawing.Size(88, 13);
      this.lblPlaying.TabIndex = 0;
      this.lblPlaying.Text = "Currently Playing:";
      // 
      // lblPosition
      // 
      this.lblPosition.AutoSize = true;
      this.lblPosition.Location = new System.Drawing.Point(13, 152);
      this.lblPosition.Name = "lblPosition";
      this.lblPosition.Size = new System.Drawing.Size(0, 13);
      this.lblPosition.TabIndex = 1;
      // 
      // label1
      // 
      this.label1.AutoSize = true;
      this.label1.Location = new System.Drawing.Point(13, 19);
      this.label1.Name = "label1";
      this.label1.Size = new System.Drawing.Size(57, 13);
      this.label1.TabIndex = 2;
      this.label1.Text = "Stream ID:";
      // 
      // txtStreamID
      // 
      this.txtStreamID.Location = new System.Drawing.Point(76, 16);
      this.txtStreamID.Name = "txtStreamID";
      this.txtStreamID.Size = new System.Drawing.Size(338, 20);
      this.txtStreamID.TabIndex = 3;
      this.txtStreamID.Text = "50815dae0bf9d5600d000001 ";
      this.txtStreamID.TextChanged += new System.EventHandler(this.txtStreamID_TextChanged);
      // 
      // cmdStart
      // 
      this.cmdStart.Location = new System.Drawing.Point(179, 73);
      this.cmdStart.Name = "cmdStart";
      this.cmdStart.Size = new System.Drawing.Size(75, 23);
      this.cmdStart.TabIndex = 4;
      this.cmdStart.Text = "Start";
      this.cmdStart.UseVisualStyleBackColor = true;
      this.cmdStart.Click += new System.EventHandler(this.cmdStart_Click);
      // 
      // tmrUpdateStatus
      // 
      this.tmrUpdateStatus.Tick += new System.EventHandler(this.tmrUpdateStatus_Tick);
      // 
      // txtServerUrl
      // 
      this.txtServerUrl.Location = new System.Drawing.Point(76, 42);
      this.txtServerUrl.Name = "txtServerUrl";
      this.txtServerUrl.Size = new System.Drawing.Size(338, 20);
      this.txtServerUrl.TabIndex = 6;
      this.txtServerUrl.Text = "http://td02-w7.rockpool.local:8046";
      // 
      // label2
      // 
      this.label2.AutoSize = true;
      this.label2.Location = new System.Drawing.Point(13, 45);
      this.label2.Name = "label2";
      this.label2.Size = new System.Drawing.Size(66, 13);
      this.label2.TabIndex = 5;
      this.label2.Text = "Server URL:";
      // 
      // frmMain
      // 
      this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
      this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
      this.ClientSize = new System.Drawing.Size(547, 196);
      this.Controls.Add(this.txtServerUrl);
      this.Controls.Add(this.label2);
      this.Controls.Add(this.cmdStart);
      this.Controls.Add(this.txtStreamID);
      this.Controls.Add(this.label1);
      this.Controls.Add(this.lblPosition);
      this.Controls.Add(this.lblPlaying);
      this.Name = "frmMain";
      this.Text = "frmMain";
      this.Load += new System.EventHandler(this.frmMain_Load);
      this.ResumeLayout(false);
      this.PerformLayout();

    }

    #endregion

    private System.Windows.Forms.Label lblPlaying;
    private System.Windows.Forms.Label lblPosition;
    private System.Windows.Forms.Label label1;
    private System.Windows.Forms.TextBox txtStreamID;
    private System.Windows.Forms.Button cmdStart;
    private System.Windows.Forms.Timer tmrUpdateStatus;
    private System.Windows.Forms.TextBox txtServerUrl;
    private System.Windows.Forms.Label label2;
  }
}